import Layout from "../../components/Layout/Layout"
import StreamingUI from "../../components/index/index"
import { connect, ConnectedProps, useDispatch, useSelector } from 'react-redux';
import { RootState } from "../../store"
import { useEffect, useRef, useState } from "react";
import { getMedia, getRecommendedFeed } from "../../redux/actions/getMedia";
import { getComment } from '../../redux/actions/getComment';
import { Video } from "../../components/index/main.interface";
import WelcomeOnboardingModal from "../../components/onboarding/WelcomeOnboardingModal";

const mapStateToProps = (state: RootState) => ({
    media: state.getMedia.media,
    content: state.getCommentReducer.comments,
});

const actionCreators = { getMedia, getComment, getRecommendedFeed };
const connector = connect(mapStateToProps, actionCreators);
type PropsFromRedux = ConnectedProps<typeof connector>;

interface MainProps extends PropsFromRedux {
media: Video[] | null
}

const Main = ({ media, getMedia, getComment }: MainProps) => {
    const LoginReducer = useSelector((state) => state.LoginReducer);
    const hasCalled = useRef(false);
    const dispatch = useDispatch();

    const needsOnboarding =
        LoginReducer.user &&
        !LoginReducer.user.onboarding_completed;

    const [showOnboarding, setShowOnboarding] = useState<boolean>(!!needsOnboarding);

    const handleOnboardingComplete = () => {
        setShowOnboarding(false);
    };

    useEffect(() => {
    if (!hasCalled.current) {
        const hasSeenInitial = localStorage.getItem("seen_initial");
        if (!LoginReducer.user.has_seen_videos && !hasSeenInitial) {
            getMedia();
        } else {
            getRecommendedFeed()(dispatch);
        }

        hasCalled.current = true;
    }
}, [getMedia, getRecommendedFeed]);

    return (
        <Layout>
            <StreamingUI media={media} getComment={getComment} />
            {showOnboarding && (
                <WelcomeOnboardingModal
                    user={LoginReducer.user}
                    onComplete={handleOnboardingComplete}
                />
            )}
        </Layout>
    );
};



export default connector(Main); 
