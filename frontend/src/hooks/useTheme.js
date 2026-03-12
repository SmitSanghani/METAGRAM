import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setTheme } from '../redux/authSlice';

const useTheme = () => {
    const { theme } = useSelector(store => store.auth);
    const dispatch = useDispatch();

    useEffect(() => {
        const body = document.body;
        // Remove existing theme classes
        body.classList.remove('dark-theme', 'light-theme');
        // Add current theme class
        body.classList.add(theme);
        
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        const newTheme = theme === 'dark-theme' ? 'light-theme' : 'dark-theme';
        dispatch(setTheme(newTheme));
    };

    return { theme, toggleTheme };
};

export default useTheme;
