package nl.aidatim.member

import android.app.Application
import nl.aidatim.member.core.security.AndroidAppContext

/** Captures the application context so shared code can build secure storage. */
class MemberApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        AndroidAppContext.init(this)
    }
}
