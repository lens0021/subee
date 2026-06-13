package io.github.lens0021.subee

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.sync.Semaphore
import kotlinx.coroutines.sync.withPermit
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

/**
 * Polls subscribed accounts for new posts while the app is closed,
 * mirroring src/sync/pollFeed.ts of the web app: one
 * GET /api/v1/accounts/{id}/statuses?since_id=... per account, all routed
 * through the user's own instance.
 */
class FeedSyncWorker(
    appContext: Context,
    params: WorkerParameters,
) : CoroutineWorker(appContext, params) {
    override suspend fun doWork(): Result =
        withContext(Dispatchers.IO) {
            val store = SyncStore(applicationContext)
            if (!store.backgroundSyncEnabled) return@withContext Result.success()
            val state = store.loadState() ?: return@withContext Result.success()
            val accessToken = state.optString("accessToken")
            val cursors = state.optJSONArray("cursors") ?: JSONArray()
            if (accessToken.isEmpty() || cursors.length() == 0) {
                return@withContext Result.success()
            }

            // Poll accounts concurrently (bounded) instead of one at a time, so
            // the worker finishes sooner and holds the wakelock for less time.
            val polled =
                coroutineScope {
                    val gate = Semaphore(POLL_CONCURRENCY)
                    (0 until cursors.length())
                        .mapNotNull { i -> cursors.optJSONObject(i) }
                        .map { cursor ->
                            async {
                                val handle = cursor.optString("handle")
                                val sinceId = cursor.optString("sinceId")
                                val accountId = cursor.optString("accountId")
                                val instanceUrl = cursor.optString("instanceUrl").trimEnd('/')
                                if (handle.isEmpty() || accountId.isEmpty() || instanceUrl.isEmpty()) {
                                    return@async null
                                }
                                // Accounts without a sinceId have never been loaded
                                // in-app; leave them to the foreground initial fetch.
                                if (sinceId.isEmpty() || sinceId == "null") return@async null
                                gate.withPermit {
                                    try {
                                        val posts =
                                            fetchStatuses(instanceUrl, accountId, sinceId, accessToken)
                                        val list = ArrayList<JSONObject>(posts.length())
                                        for (j in 0 until posts.length()) list.add(posts.getJSONObject(j))
                                        val update =
                                            JSONObject()
                                                .put("lastPolledAt", System.currentTimeMillis())
                                                .put(
                                                    "sinceId",
                                                    if (list.isNotEmpty()) list[0].getString("id") else sinceId,
                                                )
                                        handle to (update to list)
                                    } catch (_: Exception) {
                                        // skip this account until the next run
                                        null
                                    }
                                }
                            }
                        }.awaitAll()
                }

            val updates = HashMap<String, JSONObject>()
            val fetched = ArrayList<JSONObject>()
            for (entry in polled) {
                if (entry == null) continue
                updates[entry.first] = entry.second.first
                fetched.addAll(entry.second.second)
            }

            if (updates.isNotEmpty()) {
                val added = store.recordPollResults(updates, fetched)
                if (added > 0) {
                    // Show the cumulative number of posts waiting to be viewed,
                    // updating the single existing notification in place.
                    Notifications.showNewPosts(applicationContext, store.pendingPostCount())
                }
            }
            Result.success()
        }

    private fun fetchStatuses(
        instanceUrl: String,
        accountId: String,
        sinceId: String,
        accessToken: String,
    ): JSONArray {
        val url = URL("$instanceUrl/api/v1/accounts/$accountId/statuses?since_id=$sinceId&limit=$PAGE_SIZE")
        val conn = url.openConnection() as HttpURLConnection
        conn.connectTimeout = TIMEOUT_MS
        conn.readTimeout = TIMEOUT_MS
        conn.setRequestProperty("Authorization", "Bearer $accessToken")
        try {
            if (conn.responseCode != HttpURLConnection.HTTP_OK) {
                throw IllegalStateException("HTTP ${conn.responseCode}")
            }
            return JSONArray(conn.inputStream.bufferedReader().readText())
        } finally {
            conn.disconnect()
        }
    }

    companion object {
        private const val PAGE_SIZE = 20
        private const val TIMEOUT_MS = 15_000
        // Mirrors the web pollFeed concurrency; bounds simultaneous requests.
        private const val POLL_CONCURRENCY = 4
    }
}
