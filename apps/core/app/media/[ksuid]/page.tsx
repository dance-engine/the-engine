import Link from 'next/link'
import { MdArrowBack, MdCloudUpload } from 'react-icons/md'
import MediaPhotoList from './MediaPhotoList'

type Props = {
  params: Promise<{ ksuid: string }>
}

const MediaPhotosPage = async ({ params }: Props) => {
  const { ksuid } = await params

  return (
    <div className="flex flex-col justify-start items-center relative">
      <div className="sm:flex sm:items-center w-full px-4 lg:px-8 pb-0">
        <div className="sm:flex-auto">
          <Link
            href="/media"
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-3"
          >
            <MdArrowBack className="w-4 h-4" /> Back to Media
          </Link>
          <div className="flex items-center justify-between">
            <h1 className="text-base font-semibold text-gray-900">Event Photos</h1>
            <Link
              href={`/media/${ksuid}/upload`}
              className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800"
            >
              <MdCloudUpload className="w-4 h-4" /> Upload more
            </Link>
          </div>
          <p className="mt-2 text-sm text-gray-700">
            Photos currently on the CDN for this event. Hover a photo to delete it.
          </p>
        </div>
      </div>
      <div className="w-full px-4 lg:px-8 mt-6">
        <MediaPhotoList eventKsuid={ksuid} />
      </div>
    </div>
  )
}

export default MediaPhotosPage
