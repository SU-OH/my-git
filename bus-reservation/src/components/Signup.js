import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { useNavigate, Link } from 'react-router-dom';
import { doc, setDoc, getDocs, collection, query, where } from 'firebase/firestore';

function Signup() {
  const [email, setEmail] = useState('');
  const [isEmailAvailable, setIsEmailAvailable] = useState(null); // 이메일 사용 가능 여부
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState(null);
  const [passwordValidations, setPasswordValidations] = useState({
    length: false,
    uppercase: false,
    specialChar: false,
  });
  const navigate = useNavigate();

  const validatePassword = (password) => {
    const hasUppercase = /[A-Z]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const isValidLength = password.length >= 8 && password.length <= 16;

    setPasswordValidations({
      length: isValidLength,
      uppercase: hasUppercase,
      specialChar: hasSpecialChar,
    });

    return isValidLength && hasUppercase && hasSpecialChar;
  };

  const handlePasswordChange = (e) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    validatePassword(newPassword);
  };

  const handleEmailCheck = async () => {
    setError(null);
    setIsEmailAvailable(null);
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', email));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setIsEmailAvailable(true);
      } else {
        setIsEmailAvailable(false);
        setError('이미 사용 중인 이메일입니다.');
      }
    } catch (err) {
      console.error('이메일 중복 확인 오류:', err);
      setError('이메일 확인 중 문제가 발생했습니다.');
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError(null);

    if (!validatePassword(password)) {
      setError('비밀번호가 요구 조건을 충족하지 않습니다.');
      return;
    }

    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    if (isEmailAvailable === false || isEmailAvailable === null) {
      setError('이메일 중복 확인을 완료해주세요.');
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 사용자 정보 저장
      await setDoc(doc(db, 'users', user.uid), {
        name,
        email,
        phone,
        createdAt: new Date(),
      });

      // 이메일 인증 전송
      await sendEmailVerification(user);
      alert('회원가입이 완료되었습니다. 이메일 인증 후 로그인해 주세요.');
      navigate('/');
    } catch (error) {
      console.error('회원가입 오류:', error);
      setError('회원가입 중 오류가 발생했습니다. 다시 시도해 주세요.');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-mint-light">
      <div className="bg-white p-8 rounded-xl shadow-md w-80">
        <h1 className="text-3xl font-bold mb-6 text-center text-mint">회원가입</h1>
        {error && <p className="text-red-500 mb-4 text-center">{error}</p>}
        
        <form onSubmit={handleSignup} className="space-y-4">
          <div className="relative">
            <input
              type="email"
              placeholder="이메일"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setIsEmailAvailable(null); // 이메일이 변경되면 중복 확인 초기화
              }}
              className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:border-mint"
              required
            />
            <button
              type="button"
              onClick={handleEmailCheck}
              className="absolute right-2 top-2 bg-mint hover:bg-mint-dark text-white py-2 px-4 rounded font-semibold"
            >
              중복 확인
            </button>
          </div>
          {isEmailAvailable === true && <p className="text-green-500 text-sm mt-2">사용 가능한 이메일입니다.</p>}
          {isEmailAvailable === false && <p className="text-red-500 text-sm mt-2">이미 사용 중인 이메일입니다.</p>}
          <input
            type="text"
            placeholder="이름"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:border-mint"
            required
          />
          <input
            type="text"
            placeholder="전화번호"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:border-mint"
            required
          />
          <input
            type="password"
            placeholder="비밀번호 (8~16자, 대문자, 특수문자 포함)"
            value={password}
            onChange={handlePasswordChange}
            className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:border-mint"
            required
          />
          <ul className="text-sm text-gray-600 mb-4">
            <li className={passwordValidations.length ? 'text-green-600' : 'text-red-600'}>
              {passwordValidations.length ? '✔' : '✘'} 8~16자
            </li>
            <li className={passwordValidations.uppercase ? 'text-green-600' : 'text-red-600'}>
              {passwordValidations.uppercase ? '✔' : '✘'} 대문자 포함
            </li>
            <li className={passwordValidations.specialChar ? 'text-green-600' : 'text-red-600'}>
              {passwordValidations.specialChar ? '✔' : '✘'} 특수문자 포함
            </li>
          </ul>
          <input
            type="password"
            placeholder="비밀번호 재입력"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:border-mint"
            required
          />
          <button
            type="submit"
            className="w-full bg-mint hover:bg-mint-dark text-white py-2 rounded font-semibold transition duration-300"
          >
            회원가입
          </button>
        </form>
        <p className="mt-6 text-center text-gray-600">
          계정이 있으신가요?{' '}
          <Link to="/" className="text-mint hover:underline">
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Signup;
