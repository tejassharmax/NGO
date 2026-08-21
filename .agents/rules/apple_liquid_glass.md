# Apple iOS 18 / VisionOS "Liquid Glass" Styling Specification

Whenever the user requests "liquid glass", Apple-style glassmorphic capsules, or frosted floating control bars, strictly apply the following CSS architecture and design tokens.

## 1. Liquid Glass Capsule Container
Use an outer floating capsule container with double-specular refraction and deep saturation blur:

```css
.liquid-glass-capsule {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px;
  border-radius: 30px;
  background: rgba(255, 255, 255, 0.28);
  backdrop-filter: blur(24px) saturate(190%);
  -webkit-backdrop-filter: blur(24px) saturate(190%);
  border: 1px solid rgba(255, 255, 255, 0.45);
  box-shadow: 
    0 8px 32px 0 rgba(15, 23, 42, 0.18),
    inset 0 1px 1.5px 0 rgba(255, 255, 255, 0.7),
    inset 0 -1px 1px 0 rgba(0, 0, 0, 0.06);
  z-index: 4;
}
```

## 2. Liquid Glass Circular / Pill Buttons
Individual action buttons placed within or alongside the capsule:

```css
.liquid-glass-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.5);
  background: rgba(255, 255, 255, 0.45);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  color: #1e293b;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 
    inset 0 1px 1.5px rgba(255, 255, 255, 0.8),
    0 2px 6px rgba(0, 0, 0, 0.08);
  transition: all 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.liquid-glass-btn:hover {
  background: rgba(255, 255, 255, 0.88);
  color: #1a73e8;
  transform: scale(1.1);
  box-shadow: 
    inset 0 1px 2px rgba(255, 255, 255, 1),
    0 4px 14px rgba(0, 0, 0, 0.14);
}

.liquid-glass-btn:active {
  transform: scale(0.94);
}

.liquid-glass-btn--danger:hover {
  color: #ffffff !important;
  background: rgba(239, 68, 68, 0.88) !important;
  border-color: rgba(239, 68, 68, 0.5) !important;
}
```

## 3. Dark Mode Adaptation
Ensure seamless contrast in dark theme modes:

```css
body.theme-dark .liquid-glass-capsule {
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(24px) saturate(190%);
  -webkit-backdrop-filter: blur(24px) saturate(190%);
  border-color: rgba(255, 255, 255, 0.18);
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.45),
    inset 0 1px 1px rgba(255, 255, 255, 0.25);
}

body.theme-dark .liquid-glass-btn {
  background: rgba(255, 255, 255, 0.12);
  color: #f8fafc;
  border-color: rgba(255, 255, 255, 0.16);
  box-shadow: 
    inset 0 1px 1px rgba(255, 255, 255, 0.2),
    0 2px 6px rgba(0, 0, 0, 0.25);
}

body.theme-dark .liquid-glass-btn:hover {
  background: rgba(255, 255, 255, 0.28);
  color: #60a5fa;
  box-shadow: 
    inset 0 1px 1.5px rgba(255, 255, 255, 0.35),
    0 4px 14px rgba(0, 0, 0, 0.35);
}
```
