import Layout from "../../components/Layout/Layout"
import StreamingUI from "../../components/index/index"
import { connect, ConnectedProps, useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from "../../store"
import { useEffect, useState } from "react";
import { getMedia, getRecommendedFeed } from "../../redux/actions/getMedia";
import { getComment } from '../../redux/actions/getComment';
import { refreshSession } from "../../redux/actions/Login";
import { Video } from "../../components/index/main.interface";
import WelcomeOnboardingModal from "../../components/onboarding/WelcomeOnboardingModal";
import { UPDATE_USER } from "../../redux/type";

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

// Module-level guard — survives re-mounts (navigating away and back)
let _initialFeedLoaded = false;
let _initialSessionRefreshed = false;

const Main = ({ media, getMedia, getComment }: MainProps) => {
    const loginUser = useSelector((state: RootState) => (state.LoginReducer as unknown as { user: { onboarding_completed?: boolean; has_seen_videos?: boolean } | null })?.user ?? null);
    const dispatch = useDispatch<AppDispatch>();

    const needsOnboarding = loginUser && !loginUser.onboarding_completed;
    const [showOnboarding, setShowOnboarding] = useState<boolean>(!!needsOnboarding);

    const handleOnboardingComplete = () => {
        dispatch({ type: UPDATE_USER, payload: { user: { onboarding_completed: true } } });
        const stored = localStorage.getItem("user");
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                localStorage.setItem("user", JSON.stringify({ ...parsed, onboarding_completed: true }));
            } catch { /* invalid JSON in localStorage, skip */ }
        }
        setShowOnboarding(false);
    };

    useEffect(() => {
        // Refresh session once per app session, not on every re-mount
        if (!_initialSessionRefreshed) {
            _initialSessionRefreshed = true;
            (dispatch as AppDispatch)(refreshSession());
        }

        // Only fetch feed if Redux store is empty AND we haven't fetched yet this session
        const hasVideos = Array.isArray(media) && media.length > 0;
        if (hasVideos || _initialFeedLoaded) return;
        _initialFeedLoaded = true;

        const hasSeenInitial = localStorage.getItem("seen_initial");
        if (!hasSeenInitial) {
            getMedia();
        } else {
            getRecommendedFeed()(dispatch);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <Layout>
            <StreamingUI media={media} getComment={getComment} />
            {showOnboarding && (
                <WelcomeOnboardingModal
                    user={loginUser}
                    onComplete={handleOnboardingComplete}
                />
            )}
        </Layout>
    );
};

export default connector(Main);
