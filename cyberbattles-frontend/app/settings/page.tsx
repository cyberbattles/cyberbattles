'use client';
// REF: https://claude.ai/chat/a83db380-0717-44e1-a790-132c58ad3299

import React, { useEffect, useState } from 'react';
import { User, Bell, Shield, Database, Mail, Moon, Sun, ChevronRight } from 'lucide-react';
import {
  onAuthStateChanged,
  updateProfile,
  updateEmail,
  sendPasswordResetEmail,
  signOut,
} from 'firebase/auth';
import { collection, doc, getDocs, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

const Settings = () => {
  const [settings, setSettings] = useState({
    emailNotifications: true,
    pushNotifications: false,
    twoFactorAuth: false,
    dataSync: true,
    darkMode: false,
    emailUpdates: true,
    displayName: '',
    email: '',
  });

  const [activeTab, setActiveTab] = useState('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [userDisplayName, setDisplayName] = useState<any>(null);
  const [userDisplayEmail, setDisplayEmail] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        setDisplayName(user.displayName || '');
        setDisplayEmail(user.email || '');
      } else {
        setDisplayName('');
        setDisplayEmail('');
      }
    });
    return () => unsubscribe();
  }, []);

  const handleInputChange = (e: { target: { name: any; value: any; type: any; checked: any; }; }) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSaveChanges = async () => {
    const user = auth.currentUser;

    if (!user) {
      console.error("No user is currently signed in.");
      return;
    }

    try {
      if (user.displayName !== userDisplayName) {
        await updateProfile(user, { displayName: userDisplayName });
      }

      if (user.email !== userDisplayEmail) {
        await updateEmail(user, userDisplayEmail);
      }

      const userDocRef = doc(db, "login", user.uid);
      await updateDoc(userDocRef, {
        userName: userDisplayName,
        email: userDisplayEmail,
      });

      alert("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile. You may need to reauthenticate.");
    }
  }

  const handleSave = async () => {
    if (!currentUser) return;

    setIsSaving(true);
    setSaveMessage('');

    try {
      if (userDisplayName !== currentUser.displayName) {
        await updateProfile(currentUser, { displayName: userDisplayName });
      }

      if (userDisplayEmail !== currentUser.email) {
        await updateEmail(currentUser, userDisplayEmail);
      }

      setSaveMessage('Settings saved successfully!');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      setSaveMessage(`Error: ${error.message}`);
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMessage(''), 4000);
    }
  };

  const handlePasswordReset = async () => {
    if (!currentUser?.email) {
      alert('No user email found.');
      return;
    }

    try {
      await sendPasswordResetEmail(auth, currentUser.email);
      alert('Password reset email sent!');
    } catch (error: any) {
      alert(`Error sending password reset email: ${error.message}`);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      alert('You have been signed out.');
      window.location.href = '/'; 
    } catch (error: any) {
      alert(`Sign out failed: ${error.message}`);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const userRef = collection(db, "login");
          const userSnap = await getDocs(userRef);

          const userId = currentUser.uid;

          for (const userDoc of userSnap.docs) {
            const userData = userDoc.data();

            if (userData.UID === userId) {
                setDisplayName(userData.userName);
                return; 
              }
          }

          console.warn("User not found in any team");
          setDisplayName("John Smith");
        } catch (error) {
          console.error("Error fetching teams:", error);
          setDisplayName("John Smith")
        }
      } else {
        setDisplayName("John Smith")
      }
    });

    return () => unsubscribe();
  }, [auth, db]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const userRef = collection(db, "login");
          const userSnap = await getDocs(userRef);

          const userId = currentUser.uid;

          for (const userDoc of userSnap.docs) {
            const userData = userDoc.data();

            if (userData.UID === userId) {
                setDisplayEmail(userData.email);
                return; 
              }
          }

          console.warn("User not found in any team");
          setDisplayEmail("JohnSmith@gmail.com");
        } catch (error) {
          console.error("Error fetching teams:", error);
          setDisplayEmail("JohnSmith@gmail.com")
        }
      } else {
        setDisplayEmail("JohnSmith@gmail.com")
      }
    });

    return () => unsubscribe();
  }, [auth, db]);

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ];

  return (
    <div className="min-h-screen bg-[#2f2f2f] p-8 pt-60">
      <div className="max-w-6xl mx-auto">
        {/* Main Content Card */}
        <div className="bg-white rounded-3xl shadow-lg border border-slate-200 overflow-hidden">
          {/* Navigation Tabs */}
          <div className="border-b border-slate-200 bg-slate-50">
            <nav className="flex px-8" aria-label="Settings navigation">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-3 px-6 py-5 text-sm font-semibold transition-all relative ${
                      activeTab === tab.id
                        ? 'text-blue-600'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{tab.label}</span>
                    {activeTab === tab.id && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Content Area */}
          <div className="p-8">
            {activeTab === 'profile' && (
              <div className="space-y-8">
                {/* Profile Information Section */}
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 mb-6">Profile Information</h2>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Display Name
                      </label>
                      <input
                        type="text"
                        name="displayName"
                        value={userDisplayName || 'John Smith'} 
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-all text-slate-900"
                        placeholder="Enter your display name"
                      />
                      <p className="mt-2 text-xs text-slate-500">This name will be visible to other users</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={userDisplayEmail || 'JohnSmith@account.com'}
                        onChange={(e) => setDisplayEmail(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-all text-slate-900"
                        placeholder="Enter your email address"
                      />
                      <p className="mt-2 text-xs text-slate-500">Your primary email for account communications</p>
                    </div>
                  </div>
                </div>

                {/* Security Section */}
                <div className="pt-6 border-t border-slate-200">
                  <h2 className="text-xl font-semibold text-slate-900 mb-6">Security</h2>
                  
                  <div className="space-y-4">
                    <button 
                      onClick={handlePasswordReset}
                      className="flex items-center justify-between w-full p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Shield className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-semibold text-slate-900">Change Password</p>
                          <p className="text-xs text-slate-500">Update your account password</p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
                    </button>

                    <button 
                      onClick={handleSignOut}
                      className="flex items-center justify-between w-full p-4 bg-slate-50 hover:bg-red-50 border border-slate-200 hover:border-red-200 rounded-lg transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-100 rounded-lg">
                          <Mail className="w-5 h-5 text-red-600" />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-semibold text-slate-900 group-hover:text-red-600 transition-colors">Sign Out</p>
                          <p className="text-xs text-slate-500">Sign out from your account</p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-red-600 transition-colors" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div>
                <h2 className="text-xl font-semibold text-slate-900 mb-6">Notification Preferences</h2>
                
                <div className="space-y-1">
                  {/* Email Notifications */}
                  <div className="flex items-center justify-between p-5 hover:bg-slate-50 rounded-lg transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <Mail className="w-5 h-5 text-slate-400" />
                        <p className="text-sm font-semibold text-slate-900">Email Notifications</p>
                      </div>
                      <p className="text-xs text-slate-500 ml-8">Receive important updates and notifications via email</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer ml-4">
                      <input
                        type="checkbox"
                        name="emailNotifications"
                        checked={settings.emailNotifications}
                        onChange={handleInputChange}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {/* Push Notifications */}
                  <div className="flex items-center justify-between p-5 hover:bg-slate-50 rounded-lg transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <Bell className="w-5 h-5 text-slate-400" />
                        <p className="text-sm font-semibold text-slate-900">Push Notifications</p>
                      </div>
                      <p className="text-xs text-slate-500 ml-8">Receive real-time notifications on your device</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer ml-4">
                      <input
                        type="checkbox"
                        name="pushNotifications"
                        checked={settings.pushNotifications}
                        onChange={handleInputChange}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {/* Marketing Emails */}
                  <div className="flex items-center justify-between p-5 hover:bg-slate-50 rounded-lg transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <Database className="w-5 h-5 text-slate-400" />
                        <p className="text-sm font-semibold text-slate-900">Marketing Communications</p>
                      </div>
                      <p className="text-xs text-slate-500 ml-8">Receive promotional content and product updates</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer ml-4">
                      <input
                        type="checkbox"
                        name="emailUpdates"
                        checked={settings.emailUpdates}
                        onChange={handleInputChange}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="px-8 py-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <div className="flex-1">
              {saveMessage && (
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-green-700 font-medium">{saveMessage}</span>
                </div>
              )}
            </div>
            <button
              onClick={handleSaveChanges}
              disabled={isSaving}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold shadow-sm hover:shadow-md"
            >
              {isSaving ? 'Saving Changes...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;