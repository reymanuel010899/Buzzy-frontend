import { useSelector } from "react-redux";
import { getMediaUrl } from "../../redux/client/api-client"

const ProfileIconC = () => {
  const LoginReducer = useSelector((state: { LoginReducer: { user?: { profile_picture?: string } } }) => state.LoginReducer);
  const picture = LoginReducer?.user?.profile_picture;

  return (
    <div className="relative group">
      <div className="relative">
        <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-purple-600 to-blue-500 opacity-0 group-hover:opacity-75 blur-lg transition-opacity duration-500" />
        {picture ? (
          <img
            src={getMediaUrl(picture)}
            alt="Perfil"
            className="relative w-6 h-6 rounded-full object-cover border-2 border-transparent group-hover:border-purple-400 transition-all duration-300"
          />
        ) : (
          <div className="relative w-3 h-3 rounded-full bg-gradient-to-br from-purple-600 to-blue-500 border-2 border-transparent" />
        )}
      </div>
    </div>
  )
}

export default ProfileIconC