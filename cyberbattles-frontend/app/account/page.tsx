'use client';

// Image Cropping code adapted from react-image-crop-demo:
// https://github.com/dominictobias/react-image-crop/tree/master/src/demo

import React, {useEffect, useState, useRef} from 'react';
import {db} from '../../lib/firebase';
import {
  getAuth,
  onAuthStateChanged,
  deleteUser,
  reauthenticateWithCredential,
  signOut,
} from 'firebase/auth';
import {updateProfile, EmailAuthProvider, updatePassword} from 'firebase/auth';
import {
  deleteObject,
  getDownloadURL,
  getStorage,
  ref,
  uploadBytes,
} from 'firebase/storage';
import {doc, updateDoc} from 'firebase/firestore';
import {useRouter} from 'next/navigation';
import Image from 'next/image';

import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  Crop,
  PixelCrop,
} from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import {canvasPreview} from '../../components/canvasPreview';
import {useDebounceEffect} from '../../components/useDebounceEffect';

export default function ProfilePage() {
  const learnItems = [
    ['Edit Profile', ''],
    ['Delete Account', ''],
  ];

  const auth = getAuth();
  const storage = getStorage();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [photoURL, setPhotoURL] = useState(
    'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png',
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');

  const [imgSrc, setImgSrc] = useState('');
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [photoError, setPhotoError] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Check if the user auth state has changed. If so update the currentUser
  useEffect(() => {
    try {
      onAuthStateChanged(auth, user => {
        if (user && !currentUser) {
          setCurrentUser(user);
          if (user.photoURL) {
            setPhotoURL(user.photoURL);
          }
        }
      });
    } catch (error) {
      setCurrentUser(null);
      console.error('Failed:', error);
    }
  }, [currentUser, auth]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/'); // Redirect to homepage after logout
    } catch (error) {
      console.error('Failed to log out:', error);
      setError('Failed to log out. Please try again.');
    }
  };

  // Helper function to center the crop
  function centerAspectCrop(
    mediaWidth: number,
    mediaHeight: number,
    aspect: number,
  ) {
    return centerCrop(
      makeAspectCrop(
        {
          unit: '%',
          width: 90,
        },
        aspect,
        mediaWidth,
        mediaHeight,
      ),
      mediaWidth,
      mediaHeight,
    );
  }

  function onSelectFile(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      setCrop(undefined);
      const reader = new FileReader();
      reader.addEventListener('load', () =>
        setImgSrc(reader.result?.toString() || ''),
      );
      reader.readAsDataURL(e.target.files[0]);
    }
  }

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const {width, height} = e.currentTarget;
    setCrop(centerAspectCrop(width, height, 1 / 1));
  }

  // This effect updates the preview canvas whenever the crop changes
  useDebounceEffect(
    async () => {
      if (
        completedCrop?.width &&
        completedCrop?.height &&
        imgRef.current &&
        previewCanvasRef.current
      ) {
        canvasPreview(imgRef.current, previewCanvasRef.current, completedCrop);
      }
    },
    100,
    [completedCrop],
  );

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const image = imgRef.current;
    const previewCanvas = previewCanvasRef.current;

    if (!currentUser || !completedCrop || !image || !previewCanvas) {
      // If there's no new image, but there's a username, just update that
      if (username) {
        setLoading(true);
        try {
          await updateProfile(currentUser, {displayName: username});
          const docRef = doc(db, 'login', currentUser.uid);
          await updateDoc(docRef, {userName: username});
        } catch (error) {
          console.error('Error updating username:', error);
          setError('Failed to update username.');
        }
        setLoading(false);
        window.location.reload();
      }
      return;
    }

    setLoading(true);

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    const offscreen = new OffscreenCanvas(
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
    );
    const ctx = offscreen.getContext('2d');
    if (!ctx) {
      throw new Error('No 2d context');
    }

    ctx.drawImage(
      previewCanvas,
      0,
      0,
      previewCanvas.width,
      previewCanvas.height,
      0,
      0,
      offscreen.width,
      offscreen.height,
    );

    const blob = await offscreen.convertToBlob({
      type: 'image/webp',
      quality: 0.8, // 80% quality
    });

    const fileRef = ref(storage, `${currentUser.uid}.webp`);

    try {
      // Upload the cropped image blob
      await uploadBytes(fileRef, blob);
      const newPhotoURL = await getDownloadURL(fileRef);

      const profileUpdates: {displayName?: string; photoURL?: string} = {
        photoURL: newPhotoURL,
      };
      if (username) {
        profileUpdates.displayName = username;
      }

      await updateProfile(currentUser, profileUpdates);

      if (username) {
        const docRef = doc(db, 'login', currentUser.uid);
        await updateDoc(docRef, {userName: username});
      }

      setLoading(false);
      window.location.reload();
    } catch (uploadError) {
      console.error('Error uploading file:', uploadError);
      setError('Failed to upload photo. Please try again.');
      setLoading(false);
    }
  };

  const handleCancel = (e: React.FormEvent) => {
    e.preventDefault();
    // Reset cropping states
    setImgSrc('');
    setCrop(undefined);
    setCompletedCrop(undefined);

    // Reset other form states
    setError('');
    setPhotoError('');
    setUsername('');
    setUsernameError('');
  };

  const handleDelete = async () => {
    setLoading(true);

    const credential = EmailAuthProvider.credential(email, password);

    await reauthenticateWithCredential(currentUser, credential)
      .then(() => {
        // User was authenticated
        if (currentUser.photoURL) {
          const photoURLRef = ref(storage, photoURL);
          deleteObject(photoURLRef)
            .then()
            .catch(_ => {
              console.log('Unable to delete profile picture');
            });
        }
        deleteUser(currentUser)
          .then(() => {
            setLoading(false);
            router.push('/');
          })
          .catch(_ => {
            setError('Unable to delete user');
          });
      })
      .catch(_ => {
        // error detected
        setError('Unable to authenticate user');
      });

    setLoading(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');
    setLoading(true);

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      setLoading(false);
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      setLoading(false);
      return;
    }

    if (!currentUser || !currentUser.email) {
      setPasswordError('User not found.');
      setLoading(false);
      return;
    }

    const credential = EmailAuthProvider.credential(
      currentUser.email,
      currentPassword,
    );

    try {
      await reauthenticateWithCredential(currentUser, credential);

      await updatePassword(currentUser, newPassword);

      setPasswordSuccess('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      // Revert to the main profile view after 2 seconds
      setTimeout(() => {
        setIsChangingPassword(false);
        setPasswordSuccess('');
      }, 2000);
    } catch (error: any) {
      // Handle errors like wrong password
      if (error.code === 'auth/wrong-password') {
        setPasswordError('Incorrect current password.');
      } else {
        setPasswordError('Failed to update password. Please try again.');
      }
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="text-white min-h-screen p-4 sm:p-6 lg:p-10">
        <section className="w-full max-w-4xl mx-auto flex flex-col items-center gap-10 pt-25 sm:pt-45">
          <div>
            <h1 className="text-5xl lg:text-6xl font-semibold text-gray-100 mt-10">
              Account Management
            </h1>
          </div>

          <div className="w-full rounded-xl shadow-2xl overflow-hidden border border-white">
            {/* Tab Navigation */}
            <div className="flex border-b border-white">
              {learnItems.map((item, index) => (
                <button
                  key={index}
                  className={`flex-1 py-4 px-6 text-center font-medium transition-colors duration-200 focus:outline-none ${
                    selectedIndex === index
                      ? 'border-b-2 border-gray-50 text-white'
                      : 'text-gray-400 hover:bg-gray-500/50'
                  }`}
                  onClick={() => setSelectedIndex(index)}
                >
                  {item[0]}
                </button>
              ))}
            </div>

            {/* Content Area */}
            <div className="p-8">
              {/* Edit Profile Content */}
              {selectedIndex === 0 && (
                <form onSubmit={handleUpload} className="flex flex-col gap-10">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
                    {/* Profile Picture */}
                    <div className="flex flex-col items-center gap-4 w-full">
                      {currentUser && (
                        <Image
                          src={photoURL}
                          alt="Avatar"
                          width={150}
                          height={150}
                          className="rounded-full shadow-lg"
                          loading="eager"
                        />
                      )}
                      <input
                        className="block w-full max-w-xs text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-gray-600 file:text-white hover:file:bg-gray-700"
                        type="file"
                        accept="image/*"
                        onChange={onSelectFile}
                      />
                      <div className="text-red-500 min-h-[1.5rem] text-sm pt-1 w-full text-center">
                        {photoError}
                      </div>
                    </div>

                    {/* DYNAMIC USERNAME / PASSWORD SECTION */}
                    <div className="md:col-span-2">
                      {!isChangingPassword ? (
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Username
                          </label>
                          {currentUser && (
                            <input
                              className="p-3 w-full bg-slate-700 rounded-lg border border-transparent focus:outline-none focus:ring-2 focus:ring-white placeholder-slate-400 text-white"
                              type="text"
                              value={username}
                              onChange={e => {
                                const uname = e.target.value;
                                setUsername(uname);
                                if (uname.length > 0 && uname.length < 3)
                                  setUsernameError('Min 3 characters');
                                else if (uname.length > 20)
                                  setUsernameError('Max 20 characters');
                                else if (
                                  uname.length > 0 &&
                                  !/^[a-zA-Z0-9]+$/.test(uname)
                                )
                                  setUsernameError('Alphanumeric only');
                                else setUsernameError('');
                              }}
                              placeholder={
                                currentUser.displayName || 'Set a new username'
                              }
                            />
                          )}
                          <div className="text-red-500 min-h-[1.5rem] text-sm pt-1">
                            {usernameError}
                          </div>
                          <button
                            type="button"
                            onClick={() => setIsChangingPassword(true)}
                            className="bg-gray-600 rounded-lg text-white py-2.5 px-6 hover:bg-gray-700 transition font-bold"
                          >
                            Change Password
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-4">
                          <div className="flex items-center gap-4 mb-2">
                            <button
                              type="button"
                              onClick={() => setIsChangingPassword(false)}
                              className="text-gray-400 hover:text-white transition"
                            >
                              {/* Back Arrow SVG */}
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-6 w-6"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                                />
                              </svg>
                            </button>
                            <h3 className="text-lg font-bold text-gray-200">
                              Change Your Password
                            </h3>
                          </div>

                          <input
                            className="p-3 w-full bg-slate-700 rounded-lg border border-transparent focus:outline-none focus:ring-2 focus:ring-white placeholder-slate-400 text-white"
                            type="password"
                            value={currentPassword}
                            onChange={e => setCurrentPassword(e.target.value)}
                            placeholder="Current Password"
                            required
                          />
                          <input
                            className="p-3 w-full bg-slate-700 rounded-lg border border-transparent focus:outline-none focus:ring-2 focus:ring-white placeholder-slate-400 text-white"
                            type="password"
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            placeholder="New Password"
                            required
                          />
                          <input
                            className="p-3 w-full bg-slate-700 rounded-lg border border-transparent focus:outline-none focus:ring-2 focus:ring-white placeholder-slate-400 text-white"
                            type="password"
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            placeholder="Confirm New Password"
                            required
                          />
                          {passwordError && (
                            <p className="text-red-400 text-sm">
                              {passwordError}
                            </p>
                          )}
                          {passwordSuccess && (
                            <p className="text-green-400 text-sm">
                              {passwordSuccess}
                            </p>
                          )}

                          <button
                            type="button"
                            onClick={handleChangePassword}
                            className="bg-gray-600 rounded-lg text-white py-2 mt-2 px-6 w-full hover:bg-gray-700 disabled:opacity-50 transition font-bold"
                          >
                            Update Password
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons for Profile */}
                  <div className="flex flex-row w-full justify-between items-center pt-5 border-t border-slate-700">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="bg-blue-600 rounded-lg text-white py-2.5 px-6 hover:bg-blue-700 transition font-bold"
                    >
                      Logout
                    </button>

                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={handleCancel}
                        className="bg-gray-600 rounded-lg text-white py-2.5 px-6 hover:bg-gray-700 transition font-bold"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={
                          loading ||
                          usernameError !== '' ||
                          photoError !== '' ||
                          isChangingPassword
                        }
                        className="bg-gray-600 rounded-lg text-white py-2.5 px-6 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-bold"
                      >
                        Save Changes
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* Delete Account Content */}
              {selectedIndex === 1 && (
                <div className="w-full flex flex-col gap-6 max-w-lg mx-auto text-center">
                  <h3 className="text-xl font-bold text-red-400">
                    Delete Account
                  </h3>
                  <p>
                    This action is permanent and cannot be undone. To confirm,
                    please enter your email and password below.
                  </p>

                  <div className="flex flex-col w-full gap-4 text-left">
                    <input
                      className="p-3 bg-slate-700 rounded-lg border border-transparent focus:outline-none focus:ring-2 focus:ring-red-500 placeholder-gray-400-400 text-white"
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="Email Address"
                      required
                    />
                    <input
                      className="p-3 bg-slate-700 rounded-lg border border-transparent focus:outline-none focus:ring-2 focus:ring-red-500 placeholder-slate-400 text-white"
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Password"
                      required
                    />
                  </div>

                  {error && <p className="text-red-400 text-sm">{error}</p>}

                  <button
                    disabled={loading}
                    onClick={handleDelete}
                    className="bg-red-600 rounded-lg text-white py-3 px-6 w-full hover:bg-red-700 disabled:opacity-50 transition font-bold"
                  >
                    I understand, delete my account
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
      {imgSrc && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex flex-col justify-center items-center p-4 z-50">
          <div className="flex flex-col items-center gap-4 border-white border p-6 rounded-lg">
            <ReactCrop
              crop={crop}
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              onComplete={c => setCompletedCrop(c)}
              aspect={1}
              className="max-w-xs max-h-[30vh]"
            >
              <img
                ref={imgRef}
                alt="Crop me"
                src={imgSrc}
                onLoad={onImageLoad}
              />
            </ReactCrop>
            <div>
              <p className="text-center text-sm text-gray-400 mb-2">Preview</p>
              <canvas
                ref={previewCanvasRef}
                className="rounded-full"
                style={{
                  border: '1px solid black',
                  objectFit: 'contain',
                  width: 150,
                  height: 150,
                }}
              />
            </div>

            <form onSubmit={handleUpload}>
              <button
                type="submit"
                disabled={loading || photoError !== ''}
                className="bg-gray-600 rounded-lg text-white py-2.5 px-6 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-bold"
              >
                Save Changes
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
