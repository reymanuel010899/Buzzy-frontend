import Layout from "../../components/Layout/Layout"
import StreamingUI from "../../components/index/index"
import { connect } from "react-redux"
import { RootState } from "../../store"
import { useEffect,  useRef } from "react";
import { getMedia } from "../../redux/actions/getMedia";
const Main = ({ media, getMedia }: { media: []; getMedia: () => void }) => {
    const hasCalled = useRef(false);
    useEffect(() => {
        if (!hasCalled.current) {
            getMedia();
            hasCalled.current = true; 
        }
    }, [getMedia]);


    return (
        <Layout>
            <StreamingUI media={media} />
        </Layout>
    );
};

const mapStateToProps = (state: RootState) => ({
    media: state.getMedia.media,
});

export default connect(mapStateToProps, { getMedia })(Main);