package nl.aidatim.member

interface Platform {
    val name: String
}

expect fun getPlatform(): Platform