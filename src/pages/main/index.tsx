import Layout from "../../componets/Layout/Layout"
import StreamingUI from "../../componets/index/inde"
import { connect } from "react-redux"
import { RootState } from "../../store"

const Main = ({}) => {
    return (
        <Layout>
            <StreamingUI/>
        </Layout>
    )
}

const mapStateToProps = (state: RootState) => ({
    user: state.register.user,
})
export default connect(mapStateToProps, {

})(Main)