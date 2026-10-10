import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import StatusMessage from '../components/StatusMessage'

const NotFound = () => (
  <>
    <Navbar />
    <StatusMessage title="Page not found" body="That link does not match a home, album, artist, playlist, or search page.">
      <Link to="/" className="inline-block mt-6 bg-white text-black rounded-full px-4 py-2 text-sm font-bold">
        Back home
      </Link>
    </StatusMessage>
  </>
)

export default NotFound
