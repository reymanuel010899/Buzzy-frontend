import { Link } from "react-router-dom"

const profileIconC = () => {
    const user = JSON.parse(localStorage.getItem("user") || "{}")
    return (
        <>
         <Link to={`/profile/${user.username || "user"}`} className="relative group">
              <div className="relative">
                <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-purple-600 to-blue-500 opacity-0 group-hover:opacity-75 blur-lg transition-opacity duration-500" />
                <img
                  src={`http://localhost:8000${user.profile_picture || "/profile_pics/avatar.webp"}`}
                  alt="Perfil"
                  className="relative w-8 h-8 rounded-full object-cover border-2 border-transparent group-hover:border-purple-400 transition-all duration-300"
                />
              </div>
            </Link>
        </>
    )
}

export default profileIconC