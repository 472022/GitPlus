import { Users, MapPin, Link as LinkIcon, Mail, Twitter } from "lucide-react";
import Avatar from "../common/Avatar";
import Button from "../common/Button";
import Input from "../common/Input";
import { useState } from "react";
import { useRepositories } from "../../context/RepositoryContext";

const ProfileSidebar = ({ user }) => {
  const { currentUser, updateProfile } = useRepositories();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user.name || "",
    bio: user.bio || "",
    location: user.location || "",
    blog: user.blog || "",
    company: user.company || "",
    twitter_username: user.twitter_username || ""
  });

  const isOwnProfile = currentUser && currentUser.login === user.login;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    await updateProfile(formData);
    setIsEditing(false);
  };

  return (
    <div className="md:w-[296px] md:relative -mt-8 md:-mt-12 z-10 mb-6 md:mb-0">
      <div className="flex md:flex-col items-center md:items-start gap-4 md:gap-0">
        <div className="relative group">
           <Avatar src={user.avatar_url} size="xxl" className="w-20 h-20 md:w-[296px] md:h-[296px] border-4 border-white dark:border-github-dark-bg" />
           <div className="hidden md:block absolute bottom-8 left-0 right-0 text-center opacity-0 group-hover:opacity-100 transition-opacity">
               <span className="bg-white dark:bg-github-dark-bg text-github-light-text dark:text-github-dark-text border border-github-light-border dark:border-github-dark-border shadow-sm rounded-md px-2 py-1 text-xs">
                   Change your avatar
               </span>
           </div>
        </div>

        <div className="pt-4 pb-4 w-full">
          {isEditing ? (
             <div className="space-y-2 mb-2">
                 <Input 
                    name="name" 
                    value={formData.name} 
                    onChange={handleChange} 
                    placeholder="Name"
                    className="text-sm py-1"
                 />
             </div>
          ) : (
             <h1 className="flex flex-col">
                <span className="text-2xl font-bold leading-tight text-github-light-text dark:text-github-dark-text">{user.name}</span>
                <span className="text-xl font-light text-github-light-text-secondary dark:text-github-dark-text-secondary">{user.login}</span>
             </h1>
          )}
        </div>
      </div>

      {isOwnProfile && (
        <div className="mb-4">
            {isEditing ? (
                <div className="flex gap-2">
                    <Button variant="primary" className="flex-1 justify-center" onClick={handleSave}>Save</Button>
                    <Button className="flex-1 justify-center" onClick={() => setIsEditing(false)}>Cancel</Button>
                </div>
            ) : (
                <Button className="w-full justify-center" onClick={() => {
                    setFormData({
                        name: user.name || "",
                        bio: user.bio || "",
                        location: user.location || "",
                        blog: user.blog || "",
                        company: user.company || "",
                        twitter_username: user.twitter_username || ""
                    });
                    setIsEditing(true);
                }}>Edit profile</Button>
            )}
        </div>
      )}

      {isEditing ? (
          <div className="space-y-3 mb-4 text-sm">
              <div>
                  <label className="block text-xs font-semibold mb-1">Bio</label>
                  <textarea 
                      name="bio"
                      value={formData.bio}
                      onChange={handleChange}
                      className="w-full px-2 py-1 bg-white dark:bg-github-dark-bg border border-github-light-border dark:border-github-dark-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-github-light-text dark:text-github-dark-text placeholder-github-light-text-secondary dark:placeholder-github-dark-text-secondary transition-colors duration-200"
                      rows={3}
                      placeholder="Add a bio"
                  />
              </div>
              <div>
                  <label className="block text-xs font-semibold mb-1">Company</label>
                  <Input name="company" value={formData.company} onChange={handleChange} placeholder="Company" />
              </div>
              <div>
                  <label className="block text-xs font-semibold mb-1">Location</label>
                  <Input name="location" value={formData.location} onChange={handleChange} placeholder="Location" />
              </div>
              <div>
                  <label className="block text-xs font-semibold mb-1">Website</label>
                  <Input name="blog" value={formData.blog} onChange={handleChange} placeholder="Website" />
              </div>
              <div>
                  <label className="block text-xs font-semibold mb-1">Twitter</label>
                  <Input name="twitter_username" value={formData.twitter_username} onChange={handleChange} placeholder="Twitter username" />
              </div>
          </div>
      ) : (
          <>
            <div className="mb-4 text-github-light-text dark:text-github-dark-text text-base">
                {user.bio}
            </div>

            <div className="flex items-center gap-1 mb-4 text-sm text-github-light-text-secondary dark:text-github-dark-text-secondary">
                <Users size={16} />
                <span className="font-bold text-github-light-text dark:text-github-dark-text hover:text-github-light-accent dark:hover:text-github-dark-accent cursor-pointer">{user.followers}</span> followers
                <span>·</span>
                <span className="font-bold text-github-light-text dark:text-github-dark-text hover:text-github-light-accent dark:hover:text-github-dark-accent cursor-pointer">{user.following}</span> following
            </div>

            <div className="space-y-2 text-sm text-github-light-text dark:text-github-dark-text">
                {user.company && <div className="flex items-center gap-2"><span className="w-4">🏢</span> {user.company}</div>}
                {user.location && <div className="flex items-center gap-2"><MapPin size={16} className="text-github-light-text-secondary dark:text-github-dark-text-secondary" /> {user.location}</div>}
                {user.email && <div className="flex items-center gap-2"><Mail size={16} className="text-github-light-text-secondary dark:text-github-dark-text-secondary" /> <a href={`mailto:${user.email}`} className="hover:text-github-light-accent dark:hover:text-github-dark-accent hover:underline">{user.email}</a></div>}
                {user.blog && <div className="flex items-center gap-2"><LinkIcon size={16} className="text-github-light-text-secondary dark:text-github-dark-text-secondary" /> <a href={user.blog} className="hover:text-github-light-accent dark:hover:text-github-dark-accent hover:underline">{user.blog}</a></div>}
                {user.twitter_username && <div className="flex items-center gap-2"><Twitter size={16} className="text-github-light-text-secondary dark:text-github-dark-text-secondary" /> <a href={`https://twitter.com/${user.twitter_username}`} className="hover:text-github-light-accent dark:hover:text-github-dark-accent hover:underline">@{user.twitter_username}</a></div>}
            </div>
          </>
      )}
      
      <div className="border-t border-github-light-border dark:border-github-dark-border my-4"></div>
      
      <div>
          <h2 className="font-semibold mb-2">Organizations</h2>
          <div className="flex gap-1">
              <Avatar src="https://github.com/vercel.png" size="sm" className="w-8 h-8 rounded-md" />
              <Avatar src="https://github.com/tailwindlabs.png" size="sm" className="w-8 h-8 rounded-md" />
          </div>
      </div>
    </div>
  );
};

export default ProfileSidebar;
