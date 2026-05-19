import Link from 'next/link'
import { MdArrowBack } from 'react-icons/md'
import MediaUploadForm from './MediaUploadForm'

type Props = {
  params: Promise<{ ksuid: string }>
}

const MediaUploadPage = async ({ params }: Props) => {
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
          <h1 className="text-base font-semibold text-gray-900">Upload Photos</h1>
          <p className="mt-2 text-sm text-gray-700">
            Upload photos for this event. Add a credit name and optional URL that applies to the whole batch.
          </p>
        </div>
      </div>
      <div className="w-full px-4 lg:px-8 mt-6">
        <MediaUploadForm eventKsuid={ksuid} />
      </div>
    </div>
  )
}

export default MediaUploadPage
