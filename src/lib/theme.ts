import { useEffect, useState } from 'react';

/**
 * 读取站点 UI 主题（亮/暗）。主题以 `document.documentElement` 上的
 * `dark` class 为准，切换时通过 MutationObserver 同步刷新。
 */
export function useTheme() {
  const [isDark, setIsDark] = useState(
    () => typeof document !== 'undefined' && document.documentElement.classList.contains('dark'),
  );

  useEffect(() => {
    const root = document.documentElement;
    const update = () => setIsDark(root.classList.contains('dark'));
    update();
    const observer = new MutationObserver(update);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return isDark;
}
