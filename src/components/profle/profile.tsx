

import { Share2, Settings, Link, Play } from "lucide-react"
import { Button } from "../ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs"
import BottomNavbar from "../Layout/ButtonNavar"
import { connect } from "react-redux"
import { RootState } from "../../store"
import { getUser } from "../../redux/actions/GetUser"
import { useEffect } from "react"
// interface VideoItem {
//   id: string
//   views: number
//   thumbnail: string
// }

// interface ProfileProps {
//   username: string
//   displayName: string
//   following: number
//   followers: number
//   likes: number
//   description: string
//   websiteUrl: string
//   videos: VideoItem[]
// }

function ProfileSeccion({getUser, user }: { media: []; getMedia: () => void }) {

  const data = {
    username: "facturize",
    displayName: "FACTURIZE",
    following: 35,
    followers: 33,
    likes: 303.2,
    description: "SOMOS UNA EMPRESA QUE GESTIONA SOFTWARE EMPRESARIALES GRATIS, SOLO PRUEBALO",
    websiteUrl: "youtube.com/channel/UCgeF...",
    videos: [
      { id: "1", views: 201, thumbnail: "/placeholder.svg?height=200&width=200" },
      { id: "2", views: 182, thumbnail: "/placeholder.svg?height=200&width=200" },
      { id: "3", views: 211, thumbnail: "/placeholder.svg?height=200&width=200" },
      { id: "4", views: 52, thumbnail: "/placeholder.svg?height=200&width=200" },
      { id: "5", views: 166, thumbnail: "/placeholder.svg?height=200&width=200" },
      { id: "6", views: 124, thumbnail: "/placeholder.svg?height=200&width=200" },
    ],
  }
  useEffect(() => {
    getUser();
  }, [getUser])

  return (
    <div className="min-h-screen bg-black text-white p-4 max-w-2xl mx-auto">
      <div className="flex flex-col items-center space-y-4">
        {/* Logo */}
        <div className="w-24 h-24 rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 flex items-center justify-center text-4xl font-bold">
          F
        </div>

        {/* Profile Info */}
        <div className="text-center">
          <h1 className="text-xl font-semibold">{data.username}</h1>
          <p className="text-gray-400">{data.displayName}</p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button variant="outline" size="icon" className="rounded-full">
            <Share2 className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="rounded-full">
            <Settings className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="rounded-full">
            <Link className="h-4 w-4" />
          </Button>
        </div>

        {/* Stats */}
        <div className="flex gap-6 text-sm">
          <div className="text-center">
            <div className="font-semibold">{data.following}</div>
            <div className="text-gray-400">Following</div>
          </div>
          <div className="text-center">
            <div className="font-semibold">{data.followers}K</div>
            <div className="text-gray-400">Followers</div>
          </div>
          <div className="text-center">
            <div className="font-semibold">{data.likes}K</div>
            <div className="text-gray-400">Likes</div>
          </div>
        </div>

        {/* Description */}
        <div className="text-center max-w-sm">
          <p className="text-sm">{data.description}</p>
          <a href={`https://${data.websiteUrl}`} className="text-red-500 text-sm mt-2 block">
            {data.websiteUrl}
          </a>
        </div>

        {/* Content Tabs */}
        <Tabs defaultValue="latest" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-gray-900">
            <TabsTrigger value="latest">Latest</TabsTrigger>
            <TabsTrigger value="popular">Popular</TabsTrigger>
            <TabsTrigger value="oldest">Oldest</TabsTrigger>
          </TabsList>
          <TabsContent value="latest" className="mt-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {data.videos.map((video) => (
                <div key={video.id} className="relative group">
                  <img
                    src={video.thumbnail || "/placeholder.svg"}
                    alt=""
                    className="w-full aspect-square object-cover rounded-lg"
                  />
                  <div className="absolute bottom-2 left-2 flex items-center gap-1 text-sm">
                    <Play className="h-4 w-4" />
                    <span>{video.views}</span>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="popular">
            <div className="text-center text-gray-400 py-8">Popular content</div>
          </TabsContent>
          <TabsContent value="oldest">
            <div className="text-center text-gray-400 py-8">Oldest content</div>
          </TabsContent>
        </Tabs>
      </div>
      <BottomNavbar />
    </div>
  )
}



const mapStateToProps = (state: RootState) => ({
  media: state.getMedia.media,
  user: state.getUserDetail.user,
});

export default connect(mapStateToProps, { getUser })(ProfileSeccion);