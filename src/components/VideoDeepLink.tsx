import { useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { apiClient } from "../redux/client/api-client"

const VideoDeepLink: React.FC = () => {
  const { uuid } = useParams<{ uuid: string }>()
  const navigate = useNavigate()

  useEffect(() => {
    if (!uuid) { navigate("/", { replace: true }); return }
    apiClient.get(`/api/videos/${uuid}/`).then((res) => {
      const username = res.data?.user_id?.username ?? res.data?.username
      if (username) {
        navigate(`/profile/${username}`, { replace: true, state: { targetVideoUuid: uuid } })
      } else {
        navigate("/", { replace: true, state: { targetVideoUuid: uuid } })
      }
    }).catch(() => {
      navigate("/", { replace: true })
    })
  }, [uuid, navigate])

  return null
}

export default VideoDeepLink
