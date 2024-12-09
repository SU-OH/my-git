// src/components/Layout.js
import React from 'react';
import { Link } from 'react-router-dom';

function Layout({ children, isAdmin }) {
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-mint p-4 text-white">
        <h1 className="text-2xl">한서대학교 통학버스 예매 시스템</h1>
      </header>
      <nav className="bg-mint-dark p-2 text-white">
        <ul className="flex space-x-4">
          <li>
            <Link to="/reservation" className="hover:underline">
              예약하기
            </Link>
          </li>
          <li>
            <Link to="/my-reservations" className="hover:underline">
              내 예약
            </Link>
          </li>
          {isAdmin && (
            <li>
              <Link to="/admin" className="hover:underline">
                관리자 페이지로 이동
              </Link>
            </li>
          )}
          <li>
            <Link to="/" className="hover:underline">
              로그아웃
            </Link>
          </li>
        </ul>
      </nav>
      <main className="p-4">{children}</main>
      <footer className="bg-gray-200 p-4 text-center">
        &copy; {new Date().getFullYear()} 한서대학교
      </footer>
    </div>
  );
}

export default Layout;
