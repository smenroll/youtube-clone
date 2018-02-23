import React, { Component } from 'react'
import gql from 'graphql-tag'
import { graphql, compose } from 'react-apollo'
import axios from 'axios'
import SwipeableViews from 'react-swipeable-views'
import ChannelDropzone from '../components/ChannelDropzone'
import ChannelAppBar from '../components/ChannelAppBar'
import ChannelModal from '../components/ChannelModal'
import ChannelSettingsModal from '../components/ChannelSettingsModal'
import ChannelAboutModal from '../components/ChannelAboutModal'
import Snackbar from 'material-ui/Snackbar'
import IconButton from 'material-ui/IconButton'
import CloseIcon from 'material-ui-icons/Close'
import Videos from '../components/ChannelTabs/Videos'
import About from '../components/ChannelTabs/About'
import SearchResults from '../components/ChannelTabs/SearchResults'
import Playlists from '../components/ChannelTabs/Playlists'
import { CURRENT_USER_QUERY, USER_PLAYLIST_QUERY } from '../queries'

class Channel extends Component {
    
    state = {
        isOwner: null,
        file: null,
        progress: 0,
        tabIndex: 0,
        modal: false,
        sortMenu: false,
        sortBy: 'newest',
        videoList: 'upload',
        settingsModal: false,
        bannerPosition: null,
        searchMode: false,
        searchString: '',
        filteredVideos: null,
        aboutModal: false,
        aboutForm: '',
        countryForm: '',
        linksForm: '',
        aboutSnackbar: false,
        sortMenuPl: false,
        sortByPl: 'newest',
        anchorElPl: null
    }
    
    componentDidMount = async () => {
        const isOwner = this.props.match.params.userId ? false : true
        await this.setState({ isOwner })
    }
    
    format = filename => {
        const d = new Date()
        const date = `${d.getMonth() + 1}-${d.getDate()}-${d.getFullYear()}`
        const cleanFilename = filename.toLowerCase().replace(/[^a-z0-9]/g, "-")
        return `banners/${date}-${cleanFilename}`
    }
    
    uploadToS3 = async (file, requestUrl) => {
        const options = {
            headers: {
                'Content-Type': file.type
            },
            onUploadProgress: (progressEvent) => {
                var percentCompleted = Math.round( (progressEvent.loaded * 100) / progressEvent.total )
                this.setState({ progress: percentCompleted })
            }
        }
        await axios.put(requestUrl, file, options)
    }
    
    handleBannerUpload = async () => {
        const { file } = this.state
        const filename = this.format(file.name)
        const filetype = file.type
        const response = await this.props.s3SignBanner({ variables: { filename, filetype }})
        const { requestUrl, bannerUrl } = response.data.s3SignBanner
        await this.uploadToS3(file, requestUrl)
        await this.props.addBanner({ variables: { bannerUrl }})
        await this.handleCancelUpload()
    }
    
    sortControl = (videos, sortBy) => {
        if(sortBy === 'newest') return videos.reverse()
        if(sortBy === 'oldest') return videos
        if(sortBy === 'popular') {
            return videos.sort((a,b) => b.views - a.views)
        }
    }
    
    sortControlPl = (playlists, sortBy) => {
        if(sortBy === 'newest') return playlists.reverse()
        if(sortBy === 'oldest') return playlists
        if(sortBy === 'last') {
            // need to fix
            return playlists
        }
    }
    
    saveBannerPosition = async () => {
        const { bannerPosition } = this.state
        await this.props.addBannerPosition({ 
            variables: { bannerPosition },
            refetchQueries: [{
                query: CURRENT_USER_QUERY
            }]
        })
        await this.setState({ bannerPosition: null, settingsModal: false })
    }
    
    populateAboutForm = () => {
        const { about, country, links } = this.props.data.currentUser
        this.setState({
            aboutForm: about || '',
            countryForm: country || '',
            linksForm: links.join(', ') || ''
        })
    }
    
    saveAboutForm = async () => {
        await this.props.aboutTab({
            variables: {
                input: {
                    about: this.state.aboutForm,
                    country: this.state.countryForm,
                    links: this.state.linksForm
                }
            },
            refetchQueries: [{
                query: CURRENT_USER_QUERY
            }]
        })
        await this.setState({
            aboutForm: '',
            countryForm: '',
            linksForm: '',
            aboutModal: false,
            aboutSnackbar: true
        })
    }
    
    getTotalViews = videos => {
        var count = 0
        videos.forEach(v => count += v.views)
        return count
    }
    
    handleKeyUp = async(e) => {
        if(e.keyCode === 13) {
            const { searchString } = this.state
            const filteredVideos = await this.props.data.currentUser.videos.filter(v => {
                return v.title.toLowerCase().includes(searchString.toLowerCase())
            })
            await this.setState({ filteredVideos })
            this.handleTabIndex(6)
        }
    }
    
    handleCountry = (e) => this.setState({ countryForm: e.target.value })
    
    handleChangeAboutForm = (e) =>  this.setState({ [e.target.name]: e.target.value })
    
    handleTabs = (e, tabIndex) => this.setState({ tabIndex })
    
    handleTabIndex = tabIndex => this.setState({ tabIndex })
    
    onDrop = (files) => this.setState({ file: files[0], modal: true })
    
    handleModalClose = () => this.setState({ modal: false })
    
    handleCancelUpload = () => this.setState({ file: null, modal: false })
    
    handleOpenSortMenu = () => this.setState({ sortMenu: true })
    
    handleCloseSortMenu = () => this.setState({ sortMenu: false })
    
    handleSortBy = sortBy => this.setState({ sortBy, sortMenu: false })
    
    handleOpenSettingsModal = () => this.setState({ settingsModal: true })
    
    handleCloseSettingsModal = () => this.setState({ settingsModal: false })
    
    handleBannerPosition = (e,bannerPosition) => this.setState({ bannerPosition })
    
    handleVideoList = type => this.setState({ videoList: type})
    
    handleSearchString = (e) => this.setState({ searchString: e.target.value })
    
    handleSearchMode = () => this.setState({ searchMode: true })
    
    handleCloseAboutModal = () => this.setState({ aboutModal: false })
    
    handleOpenAboutModal = async() => {
        await this.populateAboutForm()
        this.setState({ aboutModal: true })
    }
    
    handleAboutSnackbar = () => this.setState({ aboutSnackbar: false })
    
    handleOpenSortMenuPl = (e) => this.setState({ sortMenuPl: true, anchorElPl: e.target })
    
    handleCloseSortMenuPl = () => this.setState({ sortMenuPl: false })
    
    handleSortByPl = sortByPl => this.setState({ sortByPl, sortMenuPl: false })
    
    render(){
        const { data: { loading, currentUser }, playlists: { getUserPlaylists } } = this.props
        const loading2 = this.props.playlists.loading
        if(loading || loading2) return null
        const { 
            videos, 
            imageUrl, 
            username, 
            email, 
            bannerUrl, 
            bannerPosition, 
            about, 
            country, 
            links,
            createdOn } = currentUser
        const sortedVideos = this.sortControl(videos.slice(), this.state.sortBy)
        const sortedPlaylists = this.sortControlPl(getUserPlaylists.slice(), this.state.sortByPl)
        return(
            <div>
                <ChannelDropzone
                    onDrop={this.onDrop}
                    file={this.state.file}
                    bannerUrl={bannerUrl}
                    bannerPosition={bannerPosition}
                />
                <ChannelAppBar
                    tabIndex={this.state.tabIndex}
                    handleTabs={this.handleTabs}
                    username={username}
                    imageUrl={imageUrl}
                    openSettingsModal={this.handleOpenSettingsModal}
                    searchMode={this.state.searchMode}
                    searchString={this.state.searchString}
                    handleSearchMode={this.handleSearchMode}
                    handleSearchString={this.handleSearchString}
                    handleKeyUp={this.handleKeyUp}
                />
                <SwipeableViews
                    axis='x'
                    index={this.state.tabIndex}
                    onChangeIndex={this.handleTabIndex}
                    enableMouseEvents
                >
                    <div>home</div>
                    <Videos 
                        videos={sortedVideos}
                        handleOpenSortMenu={this.handleOpenSortMenu}
                        handleCloseSortMenu={this.handleCloseSortMenu}
                        sortMenu={this.state.sortMenu}
                        handleSortBy={this.handleSortBy}
                        sortBy={this.state.sortBy}
                        handleVideoList={this.handleVideoList}
                        videoList={this.state.videoList}
                    />
                    <Playlists
                        playlists={sortedPlaylists}
                        sortByPl={this.state.sortByPl}
                        sortMenuPl={this.state.sortMenuPl}
                        handleOpenSortMenuPl={this.handleOpenSortMenuPl}
                        handleCloseSortMenuPl={this.handleCloseSortMenuPl}
                        handleSortByPl={this.handleSortByPl}
                        anchorElPl={this.state.anchorElPl}
                    />
                    <div>FOUR</div>
                    <div>FIVE</div>
                    <About
                        email={email}
                        country={country}
                        about={about}
                        links={links}
                        createdOn={createdOn}
                        openAboutModal={this.handleOpenAboutModal}
                        totalViews={this.getTotalViews(videos)}
                        isOwner={this.state.isOwner}
                    />
                    <SearchResults
                        filteredVideos={this.state.filteredVideos}
                    />
                </SwipeableViews>
                <ChannelModal
                    open={this.state.modal}
                    handleModalClose={this.handleModalClose}
                    cancelUpload={this.handleCancelUpload}
                    uploadBanner={this.handleBannerUpload}
                    progress={this.state.progress}
                />
                <ChannelSettingsModal
                    open={this.state.settingsModal}
                    closeSettingsModal={this.handleCloseSettingsModal}
                    bannerPosition={this.state.bannerPosition}
                    setBannerPosition={this.handleBannerPosition}
                    saveBannerPosition={this.saveBannerPosition}
                />
                <ChannelAboutModal
                    open={this.state.aboutModal}
                    closeAboutModal={this.handleCloseAboutModal}
                    saveAboutForm={this.saveAboutForm}
                    about={this.state.aboutForm}
                    country={this.state.countryForm}
                    links={this.state.linksForm}
                    onChange={this.handleChangeAboutForm}
                    onChangeCountry={this.handleCountry}
                />
                <Snackbar
                    open={this.state.aboutSnackbar}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                    autoHideDuration={8000}
                    onRequestClose={this.handleAboutSnackbar}
                    message={<span>Information Saved To Database</span>}
                    action={<IconButton color="inherit" onClick={this.handleAboutSnackbar}><CloseIcon/></IconButton>}
                />
            </div>
            )
    }
}

const S3_SIGN_BANNER_MUTATION = gql`
    mutation($filename: String!, $filetype: String!) {
        s3SignBanner(filename: $filename, filetype: $filetype) {
            requestUrl
            bannerUrl
        }
    }
`

const ADD_BANNER_MUTATION = gql`
    mutation($bannerUrl: String!) {
        addBanner(bannerUrl: $bannerUrl) {
            bannerUrl
        }
    }
`

const ADD_BANNER_POSITION_MUTATION = gql`
    mutation($bannerPosition: String!) {
        addBannerPosition(bannerPosition: $bannerPosition) {
            bannerPosition
        }
    }
`

const ABOUT_TAB_MUTATION = gql`
    mutation($input: AboutInput) {
        aboutTab(input: $input) {
            about
        }
    }
`

export default compose(
    graphql(S3_SIGN_BANNER_MUTATION, { name: 's3SignBanner' }),
    graphql(ADD_BANNER_MUTATION, { name: 'addBanner' }),
    graphql(ADD_BANNER_POSITION_MUTATION, { name: 'addBannerPosition' }),
    graphql(ABOUT_TAB_MUTATION, { name: 'aboutTab' }),
    graphql(USER_PLAYLIST_QUERY, { name: 'playlists' }),
    graphql(CURRENT_USER_QUERY, { options: props => ({ variables: { userId: props.match.params.userId || null }})})
    )(Channel)