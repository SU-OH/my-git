// src/components/Login.js
import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useNavigate, Link } from 'react-router-dom';
import googleLogo from '../assets/google-logo.png';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false); // 로딩 상태
  const navigate = useNavigate();
  const googleProvider = new GoogleAuthProvider();

  // Google 로그인 핸들러
  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Firestore에 사용자 정보 저장
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      if (!userDoc.exists()) {
        // 사용자 정보가 없으면 새로 추가
        await setDoc(userDocRef, {
          name: user.displayName || 'Google User',
          email: user.email,
          phone: user.phoneNumber || '', // Google 계정에 전화번호가 없을 수 있음
          createdAt: new Date(),
          uid: user.uid,
        });
      }

      // 로그인 성공 후 이동
      navigate('/reservation');
    } catch (error) {
      console.error('Google 로그인 오류:', error);
      setError('Google 로그인에 실패했습니다. 다시 시도해주세요.');
    }
  };

  // 이메일 로그인 핸들러
  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true); // 로딩 시작
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      if (user.emailVerified) {
        navigate('/reservation');
      } else {
        setError('이메일 인증이 필요합니다. 이메일을 확인해주세요.');
      }
    } catch (error) {
      console.error('로그인 오류:', error);
      setError('로그인 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false); // 로딩 종료
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-mint-light">
      <div className="bg-white p-10 rounded-xl shadow-lg w-full max-w-md">
        <h1 className="text-4xl font-semibold mb-4 text-center text-mint">한서대학교 통학버스 예매 시스템</h1>

        {error && <p className="text-red-500 mb-4 text-center">{error}</p>}

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:border-mint"
            disabled={loading}
          />
          <input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:border-mint"
            disabled={loading}
          />
          <button
            type="submit"
            className="w-full bg-mint hover:bg-mint-dark text-white py-2 rounded font-semibold transition duration-300 flex justify-center items-center"
            disabled={loading}
          >
            {loading ? (
              <div className="loader border-t-2 border-white border-solid rounded-full w-5 h-5 animate-spin"></div>
            ) : (
              '로그인'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={handleGoogleLogin}
            className="flex flex-col items-center justify-center bg-white border border-gray-300 rounded-lg py-3 px-4 hover:bg-gray-100"
          >
            <img
              src={googleLogo}
              alt="Google Logo"
              className="w-12 h-12 mb-2" // Google 로고 크기 더 키움
            />
            <span className="text-sm text-gray-600">Google 로그인</span>
          </button>
        </div>

        <p className="mt-6 text-center text-gray-600">
          계정이 없으신가요?{' '}
          <Link to="/signup" className="text-mint hover:underline">
            회원가입
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
