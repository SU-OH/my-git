// src/components/ResetPassword.js
import React, { useState } from 'react';
import { auth } from '../firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import { Link } from 'react-router-dom';

function ResetPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      setMessage('비밀번호 재설정 이메일이 전송되었습니다. 이메일을 확인하세요.');
    } catch (err) {
      console.error('비밀번호 재설정 오류:', err);
      if (err.code === 'auth/user-not-found') {
        setError('등록되지 않은 이메일입니다.');
      } else if (err.code === 'auth/invalid-email') {
        setError('잘못된 이메일 형식입니다.');
      } else {
        setError('비밀번호 재설정 중 오류가 발생했습니다. 다시 시도해주세요.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-mint-light">
      <div className="bg-white p-10 rounded-xl shadow-lg w-full max-w-md">
        <h1 className="text-3xl font-bold mb-4 text-center text-mint">비밀번호 재설정</h1>

        {message && <p className="text-green-500 mb-4 text-center">{message}</p>}
        {error && <p className="text-red-500 mb-4 text-center">{error}</p>}

        <form onSubmit={handleResetPassword} className="space-y-4">
          <input
            type="email"
            placeholder="등록된 이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:border-mint"
          />
          <button
            type="submit"
            className="w-full bg-mint hover:bg-mint-dark text-white py-2 rounded font-semibold transition duration-300"
            disabled={loading}
          >
            {loading ? '전송 중...' : '비밀번호 재설정 이메일 전송'}
          </button>
        </form>

        <p className="mt-6 text-center text-gray-600">
          로그인 화면으로 돌아가기?{' '}
          <Link to="/" className="text-mint hover:underline">
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}

export default ResetPassword;
