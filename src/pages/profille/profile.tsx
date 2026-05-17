import { useParams } from "react-router-dom"
import ProfileSection from "../../components/profle/profile"

const Profile = () => {
    const params = useParams()
    console.log("Profile Page rendered with params:", params)

    return (<>
        <ProfileSection {...({} as any)} />
    </>)
}

export default Profile