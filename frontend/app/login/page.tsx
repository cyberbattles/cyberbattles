'use client';
import React, {useState} from 'react';
import Image from 'next/image';
import {auth} from '../../lib/firebase';
import cyberbattles from '../../public/images/title_logo.png';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import {useRouter} from 'next/navigation';
import {FirebaseError} from 'firebase/app';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [error, setError] = useState('');
  const [isRegister, setIsRegister] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (isRegister) {
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          return;
        }
        await createUserWithEmailAndPassword(auth, email, password);

        if (auth.currentUser) {
          await updateProfile(auth.currentUser, {
            displayName: username,
          });
        }
        console.log('Account created:', auth.currentUser);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        console.log('Logged in:', auth.currentUser);
      }

      if (isRegister) {
        router.push('/learn');
        // user urged check out the learn page before accessing dashboard
      } else {
        router.push('/dashboard');
        // otherwise redirects to dashboard after login
        // because not their first time accessing our site
      }
    } catch (err: unknown) {
      if (err instanceof FirebaseError) {
        setError('Incorrect password, please try again.');
      } else {
        setError('An unexpected error occurred');
        // i don't THINK it would ever hit this block
        // just had to specify a type for the error to make the linter happy
      }
    }
  };

  return (
    <>
      <section className="flex min-h-screen items-center justify-center px-12">
        <div className="w-full max-w-sm rounded-2xl bg-[#2f2f2f] p-8 shadow-md">
          <div className="mb-6 flex flex-col items-center gap-4">
            <Image
              src={cyberbattles}
              alt="website logo"
              width={300}
              height={200}
              className="object-contain"
              draggable={false}
            />
            <h2 className="text-3xl font-bold font-semibold text-white">
              {isRegister ? 'Create Account' : 'Login'}
            </h2>
          </div>

          <form onSubmit={handleAuth} className="flex flex-col gap-4">
            {isRegister && (
              <input
                className="rounded-xl border p-3 font-bold text-white
                  placeholder:text-white focus:ring-2 focus:ring-blue-400
                  focus:outline-none"
                type="text"
                value={username}
                onChange={e => {
                  const uname = e.target.value;
                  if (uname.length > 20) {
                    setUsername(uname);
                    setUsernameError(
                      'Username must be less than 20 characters',
                    );
                  } else if (uname.length < 3) {
                    setUsername(uname);
                    setUsernameError('Username must be at least 3 characters');
                  } else if (!/^[a-zA-Z0-9]+$/.test(uname)) {
                    setUsername(uname);
                    setUsernameError('Username must be alphanumeric');
                  } else {
                    setUsername(uname);
                    setUsernameError('');
                  }
                }}
                placeholder="Username"
                required
              />
            )}
            <input
              className="rounded-xl border p-3 font-bold text-white
                placeholder:text-white focus:ring-2 focus:ring-blue-400
                focus:outline-none"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email"
              required
            />
            <input
              className="rounded-xl border p-3 font-bold text-white
                placeholder:text-white focus:ring-2 focus:ring-blue-400
                focus:outline-none"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              required
            />
            {isRegister && (
              <input
                className="rounded-xl border p-3 font-bold text-white
                  placeholder:text-white focus:ring-2 focus:ring-blue-400
                  focus:outline-none"
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Confirm Password"
                required
              />
            )}
            <div className="min-h-[2rem] pt-1 pl-2 text-red-500">
              {usernameError}
              {error && <p className="text-sm text-red-500">{error}</p>}
            </div>

            <button
              type="submit"
              className={`cursor-pointer ${
                isRegister ? 'bg-green-600' : 'bg-blue-600'
              } rounded-xl px-6
                py-2 font-bold text-white transition hover:opacity-90`}
            >
              {isRegister ? 'Create Account' : 'Login'}
            </button>
          </form>

          <p
            className="mt-4 cursor-pointer text-center text-sm text-white italic
              hover:underline"
            onClick={() => setIsRegister(!isRegister)}
          >
            {isRegister
              ? 'Already have an account? Login'
              : 'Need an account? Create one'}
          </p>
        </div>
      </section>
    </>
  );
}
