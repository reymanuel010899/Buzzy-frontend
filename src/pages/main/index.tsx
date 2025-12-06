import Layout from "../../components/Layout/Layout"
import StreamingUI from "../../components/index/index"
import { connect, ConnectedProps } from "react-redux" 
import { RootState } from "../../store"
import { useEffect,  useRef } from "react";
import { getMedia } from "../../redux/actions/getMedia";
import { getComment } from '../../redux/actions/getComment';
import { Video } from "../../components/index/main.interface";

const mapStateToProps = (state: RootState) => ({
    media: state.getMedia.media,
    content: state.getCommentReducer.comments,
});

const actionCreators = { getMedia, getComment };
const connector = connect(mapStateToProps, actionCreators);
type PropsFromRedux = ConnectedProps<typeof connector>;

interface MainProps extends PropsFromRedux {
media: Video[] | null
}

const Main = ({ media, getMedia, getComment }: MainProps) => {
    const hasCalled = useRef(false);
    useEffect(() => {
        if (!hasCalled.current) {
            getMedia(); 
            hasCalled.current = true; 
        }
    }, [getMedia]);

    return (
        <Layout>
            <StreamingUI media={media} getComment={getComment} />
        </Layout>
    );
};



export default connector(Main); 
