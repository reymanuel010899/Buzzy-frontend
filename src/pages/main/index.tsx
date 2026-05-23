import Layout from "../../components/Layout/Layout"
import StreamingUI from "../../components/index/index"
import { connect, ConnectedProps, useDispatch, useSelector } from 'react-redux';
import { RootState } from "../../store"
import { useEffect, useRef, useState } from "react";
import { getMedia, getRecommendedFeed } from "../../redux/actions/getMedia";
import { getComment } from '../../redux/actions/getComment';
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

const Main = ({ media, getMedia, getComment }: MainProps) => {
    const loginUser = useSelector((state: RootState) => (state.LoginReducer as unknown as { user: { onboarding_completed?: boolean; has_seen_videos?: boolean } | null })?.user ?? null);
    const hasCalled = useRef(false);
    const dispatch = useDispatch();

    const needsOnboarding = loginUser && !loginUser.onboarding_completed;
    const [showOnboarding, setShowOnboarding] = useState<boolean>(!!needsOnboarding);

    const handleOnboardingComplete = () => {
        // Actualiza Redux y localStorage para que al recargar no vuelva a mostrar el modal
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
        if (!hasCalled.current) {
            const hasSeenInitial = localStorage.getItem("seen_initial");
            if (!loginUser?.has_seen_videos && !hasSeenInitial) {
                getMedia();
            } else {
                getRecommendedFeed()(dispatch);
            }
            hasCalled.current = true;
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
