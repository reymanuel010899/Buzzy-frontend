import { useSelector } from "react-redux";
import { getBaseUrl } from "../../redux/client/api-client"

const profileIconC = () => {
   const LoginReducer = useSelector((state) => state.LoginReducer);
  return (
    <div className="relative group">
      <div className="relative">
        <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-purple-600 to-blue-500 opacity-0 group-hover:opacity-75 blur-lg transition-opacity duration-500" />
        <img
          src={`${getBaseUrl()}/${LoginReducer.user.profile_picture}`}
          alt="Perfil"
          className="relative w-8 h-8 rounded-full object-cover border-2 border-transparent group-hover:border-purple-400 transition-all duration-300"
        />
      </div>
    </div>
  )
}

export default profileIconC