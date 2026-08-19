import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';
import { MarkdownRenderer } from '../course/MarkdownRenderer';

/**
 * 面试题的隐藏内容区：默认只显示标题与展开按钮，点击后展开阅读正文。
 * 受控组件：展开状态由父级（练习页）统一管理并持久化到 localStorage，
 * 实现“先自己作答，再展开提示/解法/标准答案”的引导式练习。
 */
export function RevealSection({
  id,
  title,
  icon,
  badge,
  content,
  open,
  onToggle,
  labelOpen,
  labelClosed,
}: {
  id: string;
  title: string;
  icon?: ReactNode;
  badge?: string;
  content: string;
  open: boolean;
  onToggle: (open: boolean) => void;
  labelOpen: string;
  labelClosed: string;
}) {
  return (
    <section
      id={id}
      data-open={open ? 'true' : 'false'}
      className={`overflow-hidden rounded-xl border shadow-sm transition-colors ${
        open ? 'border-primary/40 bg-surface-container-lowest' : 'border-outline-variant bg-surface-container-lowest/60 hover:border-primary/30'
      }`}
    >
      <button
        type="button"
        onClick={() => onToggle(!open)}
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <span className="flex min-w-0 items-center gap-3">
          {icon && <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-container/40 text-primary" aria-hidden="true">{icon}</span>}
          <span className="min-w-0">
            <span className="flex items-center gap-2 font-label-sm text-label-sm text-on-surface">
              {title}
              {badge && <span className="rounded bg-surface-container px-1.5 py-0.5 text-[11px] text-on-surface-variant">{badge}</span>}
            </span>
            <span className="block text-[12px] text-on-surface-variant">{open ? labelClosed : labelOpen}</span>
          </span>
        </span>
        <ChevronDown className={`h-5 w-5 shrink-0 text-primary transition-transform duration-300 ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={`${id}-panel`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="border-t border-outline-variant/70 px-5 py-5">
              <MarkdownRenderer markdown={content} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
