'use client'
import { UserProfile, useUser, SignInButton} from '@clerk/nextjs';
import { BiSolidLockOpen } from "react-icons/bi";


interface UserPermissions {
  admin?: string[]; // The admin key is optional and can be an array of strings, or undefined
  roles: { [key: string]: string[] }; // A dictionary where keys are strings and values are arrays of strings
  title?: string; // A string
}
const CustomPage = () => {
  const { isSignedIn, user, isLoaded } = useUser()

  if (!isLoaded) {
    return <div className="flex items-center gap-x-4 lg:gap-x-6">Loading...</div>
  }

  if (!isSignedIn) {
      // You could also add a redirect to the sign-in page here
    return <div className="flex items-center gap-x-4 lg:gap-x-6">
      <SignInButton ><button className="block px-3 py-1 text-gray-900" role="menuitem" tabIndex={-1} id="user-menu-item-1">Sign-in</button></SignInButton></div>
  }
  const permissions = user?.publicMetadata && user?.publicMetadata.roles ? user?.publicMetadata as unknown as UserPermissions : {admin: [], roles: {}} as UserPermissions
  const sitesAdmind = permissions.admin ? permissions.admin : []
  return (
    <div>
      <h1 className='text-xl'>Your current privileges</h1>
      {sitesAdmind.map((site)=>{
        const siteName = site == "*" ? "All Sites" : site
        const roles = permissions.roles[site] ? permissions.roles[site] : []
        return <div key={`site-${site}`} className='pt-3'>
          <h1>{siteName}</h1>
            <ul className='list-disc pl-4'>
            {roles.map((role : string)=>{ return <li key={`role-${role}`} >{role}</li>})}
              </ul>
        </div>
      })}

      {/* <pre>{JSON.stringify(user.publicMetadata,null,2)}</pre> */}
      {/* <p>This is the content of the custom page.</p> */}
    </div>
  )
}

const UserProfilePage = () => (
  <div className='flex justify-center'>
    <UserProfile>

      <UserProfile.Page label="Permissions" url="permissions" labelIcon={<BiSolidLockOpen className='w-4 h-4'/>}>
        <CustomPage />
      </UserProfile.Page>
      {/* <UserProfile.Link label="Homepage" url="/" labelIcon={<DotIcon />} /> */}

    </UserProfile>
  </div>
)

export default UserProfilePage