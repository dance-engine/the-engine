'use client'
import { UserProfile, useUser, SignInButton} from '@clerk/nextjs';
import { useOrgContext } from '@dance-engine/utils/OrgContext';
import { BiSolidLockOpen } from "react-icons/bi";
import Badge from '@dance-engine/ui/Badge'

import { nameFromHypenated } from '@dance-engine/utils/textHelpers'
interface UserPermissions {
  admin?: string[]; // The admin key is optional and can be an array of strings, or undefined
  roles: { [key: string]: string[] }; // A dictionary where keys are strings and values are arrays of strings
  title?: string; // A string
  organisations?:  Record<string, string[]>;
}
const CustomPage = () => {
  const { isSignedIn, user, isLoaded } = useUser()
  const { activeOrg, switchOrg } = useOrgContext()

  if (!isLoaded) {
    return <div className="flex items-center gap-x-4 lg:gap-x-6">Loading...</div>
  }

  if (!isSignedIn) {
      // You could also add a redirect to the sign-in page here
    return <div className="flex items-center gap-x-4 lg:gap-x-6">
      <SignInButton ><button className="block px-3 py-1 text-gray-900" role="menuitem" tabIndex={-1} id="user-menu-item-1">Sign-in</button></SignInButton></div>
  }
  const permissions = user?.publicMetadata && user?.publicMetadata.roles ? user?.publicMetadata as unknown as UserPermissions : {admin: [], roles: {}} as UserPermissions
  const sitesAdmind = permissions.organisations ? Object.keys(permissions.organisations) : []
  return (
    <div>
      <h2 className='text-xl'>Your current privileges</h2>
      {sitesAdmind.map((site)=>{
        const siteName = site == "*" ? "All Sites" : site
        const roles = permissions?.organisations?.[site]  ? permissions?.organisations?.[site] : []
        const active = site == activeOrg
        return <div key={`site-${site}`} className='pt-3'>
          
            <div className='flex justify-between items-start'>
              <div>
                <h2 className='text-lg'>{nameFromHypenated(siteName)}  {active ? <Badge>active</Badge> : null}</h2>
                <ul className='list-disc pl-4'>
                  {roles.map((role : string)=>{ 
                    return <li key={`role-${role}`} >{nameFromHypenated(role == "*" ? "all-permissions": role)}</li>
                  })}
                </ul>
              </div>
              {active ? null : <button className="bg-cerise-on-light text-white text-sm rounded-md font-bold px-3 py-1" onClick={()=>{switchOrg(siteName)}}>Switch to {nameFromHypenated(siteName)}</button>}
            </div>
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