import { onCLS, onINP, onLCP, onFCP, onTTFB } from 'web-vitals'

export function reportWebVitals() {
  onCLS(console.log)
  onINP(console.log)
  onLCP(console.log)
  onFCP(console.log)
  onTTFB(console.log)
}
