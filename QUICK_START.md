# 🚀 Quick Start - GitHub'a Push

## Otomatik Push (Önerilen)

```bash
cd /path/to/football-ai
./push-to-github.sh
```

## Manuel Push

```bash
cd /path/to/football-ai

# 1. Git config
git config user.name "Yuksel Arslan"
git config user.email "your-email@example.com"

# 2. Add all files
git add .

# 3. Commit
git commit -m "feat: initial project setup"

# 4. Add remote
git remote add origin https://github.com/yuksel-arslan/futball-ai.git

# 5. Push
git push -u origin main
```

## Sonraki Push'lar

```bash
git add .
git commit -m "feat: your message"
git push
```

## 🔗 Repository

**https://github.com/yuksel-arslan/futball-ai**

## ✅ Push Sonrası

1. GitHub'da repo'yu kontrol et
2. Claude Code aç
3. Repo'yu clone et:
   ```bash
   git clone https://github.com/yuksel-arslan/futball-ai.git
   cd futball-ai
   pnpm install
   ```
4. Geliştirmeye başla!

## 📚 Önemli Dosyalar

- `CLAUDE_CODE_GUIDE.md` - Ana geliştirme kılavuzu
- `SERVICES.md` - Mikroservis dokümantasyonu
- `FRONTEND_DESIGN_PRINCIPLES.md` - UI/UX prensipleri
