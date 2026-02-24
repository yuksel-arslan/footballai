# GitHub'a Push Etme Adımları

## 1. Git Config (İlk Kez)

Terminal'de aşağıdaki komutları çalıştırın (kendi bilgilerinizle):

```bash
cd /path/to/football-ai

git config user.name "Yuksel Arslan"
git config user.email "your-email@example.com"
```

## 2. Dosyaları Stage'e Ekle

```bash
# Tüm dosyaları ekle
git add .

# Durumu kontrol et
git status
```

## 3. İlk Commit

```bash
git commit -m "feat: initial project setup

- Turborepo monorepo structure
- Database schema with 14 Prisma models
- Next.js 15 frontend with Tailwind CSS v4
- Match Service backend (Express.js)
- API-Football integration
- Redis caching layer
- Complete documentation for Claude Code development

Components:
✅ apps/web: Next.js 15 frontend
✅ packages/database: Prisma schema
✅ services/match-service: Backend service
✅ Documentation: CLAUDE_CODE_GUIDE.md, SERVICES.md
✅ Frontend design principles
✅ Technical specifications

Tech Stack:
- Frontend: Next.js 15, TypeScript, Tailwind CSS v4
- Backend: Node.js 22, Express.js, Prisma
- Database: PostgreSQL (Neon)
- Cache: Redis (Upstash)
- ML: Python 3.11, FastAPI, XGBoost (coming soon)

Status: Phase 1 MVP - Core setup complete"
```

## 4. Remote Repository Ekle

```bash
# HTTPS (kolay)
git remote add origin https://github.com/yuksel-arslan/footballai.git

# veya SSH (daha güvenli, SSH key gerekli)
git remote add origin git@github.com:yuksel-arslan/footballai.git

# Kontrol et
git remote -v
```

## 5. GitHub'a Push

```bash
# Ana branch'i push et
git push -u origin main
```

### İlk Push'ta Sorun Çıkarsa

Eğer GitHub'da README varsa ve conflict çıkarsa:

```bash
# GitHub'daki değişiklikleri çek
git pull origin main --rebase

# Sonra tekrar push et
git push -u origin main
```

## 6. Başarı Kontrolü

GitHub'da https://github.com/yuksel-arslan/footballai adresine gidin ve dosyaların yüklendiğini kontrol edin.

## 7. Sonraki Push'lar

Artık sadece:

```bash
git add .
git commit -m "feat: description of changes"
git push
```

## 8. Branch Kullanımı (Önerilen)

```bash
# Yeni feature için branch oluştur
git checkout -b feature/stats-service

# Değişiklikleri yap
# ...

# Commit et
git add .
git commit -m "feat: add stats service"

# GitHub'a push et
git push -u origin feature/stats-service

# GitHub'da Pull Request oluştur
# Merge edilince main'e geçersin
```

## 🎯 Hızlı Komutlar

```bash
# Status kontrol
git status

# Log görüntüle
git log --oneline

# Değişiklikleri göster
git diff

# Son commit'i değiştir
git commit --amend

# Branch listesi
git branch -a

# Branch değiştir
git checkout main
git checkout feature/new-feature
```

## 🚨 Önemli Notlar

1. **.env dosyası asla push edilmemeli** (.gitignore'da zaten var)
2. **node_modules/** push edilmemeli (.gitignore'da var)
3. İlk push'tan önce `.gitignore`'u kontrol edin
4. Büyük dosyalar (>100MB) için Git LFS kullanın

## ✅ Checklist

- [ ] Git config ayarlandı
- [ ] Remote repository eklendi
- [ ] .env dosyası .gitignore'da
- [ ] Tüm dosyalar commit edildi
- [ ] Push başarılı
- [ ] GitHub'da dosyalar görünüyor

---

**Başarılı Push Sonrası:**

GitHub'da repo şu şekilde görünecek:

```
football-ai/
├── 📄 README.md (badges ile)
├── 📄 LICENSE
├── 📄 CONTRIBUTING.md
├── 📁 apps/
├── 📁 packages/
├── 📁 services/
├── 📄 package.json
├── 📄 turbo.json
└── 📄 pnpm-workspace.yaml
```

**Claude Code ile geliştirmeye hazır!** 🎉
