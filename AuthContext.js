import {createContext, useState, useEffect, useRef} from 'react';
import {getCookie, removeCookies, setCookies} from 'cookies-next';

const AuthContext = createContext();

export default AuthContext;

export const AuthProvider = ({children}) => {
  const [authTokens, setAuthTokens] = useState(() => getCookie('token') ? getCookie('token') : null);
  const firstTime = useRef(true);

  const loginUser = async (stakeAddress, signedData) => {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API}/identity-service/wallets/cardano/${stakeAddress}/signin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({signedData}),
    });

    const data = await response.json();

    if (response.status === 200) {
      setAuthTokens(data.token);
      setCookies('token', data.token, {
        expires: new Date(Date.now() + 10 * 60 * 1000),
        httpOnly: true,
        secure: false,
      });
    } else {
      alert('Something went wrong!');
    }
  };

  const logoutUser = () => {
    setAuthTokens(null);
    removeCookies('token');
  };

  const updateToken = async () => {
    const token = getCookie('token');

    const response = await fetch(`${process.env.NEXT_PUBLIC_API}/identity-service/tokens/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (response.status === 200) {
      setAuthTokens(data.token);

      setCookies('token', data.token, {
        expires: new Date(Date.now() + 10 * 60 * 1000),
        httpOnly: true,
        secure: false,
      });

    } else {
      logoutUser();
    }
  };

  const contextData = {
    authTokens: authTokens,
    connect: loginUser,
    disconnect: logoutUser,
  };

  useEffect(() => {
    if (firstTime.current) {
      firstTime.current = false;
      return;
    }

    const eightMinutes = 8 * 60 * 1000;

    const interval = setInterval(() => {
      if (authTokens) {
        updateToken();
      }
    }, eightMinutes);

    return () => clearInterval(interval);
  }, [authTokens]);

  return (
    <AuthContext.Provider value={contextData}>
      {children}
    </AuthContext.Provider>
  );
};
