import Layout from "../../componets/Layout/Layout"
import StreamingUI from "../../componets/index/inde"
import { connect } from "react-redux"
import { RootState } from "../../store"
import { useEffect } from "react";
import { getMedia } from "../../redux/actions/getMedia";
const Main = ({ media, getMedia }: { media: any; getMedia: () => void }) => {
    useEffect(() => {
        getMedia(); // Aquí se llama correctamente la acción
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