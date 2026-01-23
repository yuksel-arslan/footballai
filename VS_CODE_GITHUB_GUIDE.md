# 📦 Football-AI Projesini VS Code ile GitHub'a Aktarma

## 1. Paketi İndir ve Aç

### İndirilen dosya: `football-ai.tar.gz`

**Windows:**
```powershell
# PowerShell veya Git Bash kullanın
cd C:\Users\YourName\Projects
tar -xzf football-ai.tar.gz
cd football-ai
```

**Mac/Linux:**
```bash
cd ~/Projects
tar -xzf football-ai.tar.gz
cd football-ai
```

## 2. VS Code'da Aç

```bash
# Terminal'den
code .

# veya VS Code'u açıp
# File > Open Folder > football-ai klasörünü seçin
```

## 3. Git Kurulumunu Kontrol Et

VS Code terminal'inde:

```bash
git --version
```

Eğer git yüklü değilse: https://git-scm.com/downloads

## 4. Git Yapılandırması

VS Code terminal'inde:

```bash
git config --global user.name "Yuksel Arslan"
git config --global user.email "your-email@example.com"
```

## 5. Git Repository Başlat

```bash
# Proje klasöründeyken
git init
git branch -m main
```

## 6. .gitignore Kontrolü

`.gitignore` dosyası zaten var, kontrol edin:
- ✅ node_modules/
- ✅ .env
- ✅ .env*.local
- ✅ dist/
- ✅ .next/

## 7. Dosyaları Stage'e Ekle

VS Code'da iki yöntem:

### Yöntem A: Terminal
```bash
git add .
git status  # Kontrol için
```

### Yöntem B: VS Code GUI
1. Sol tarafta Source Control ikonuna tıklayın (Ctrl+Shift+G)
2. "Changes" altındaki tüm dosyaları görün
3. "+" butonuna tıklayarak tüm değişiklikleri stage'e ekleyin

## 8. İlk Commit

### Terminal:
```bash
git commit -m "feat: initial project setup

- Turborepo monorepo structure
- Database schema with 14 Prisma models
- Next.js 15 frontend with Tailwind CSS v4
- Match Service backend (Express.js)
- Complete documentation for Claude Code"
```

### VS Code GUI:
1. Source Control panelinde
2. Üstteki mesaj kutusuna commit mesajı yazın
3. ✓ (Commit) butonuna basın

## 9. GitHub'a Bağlan

### GitHub'da yapılacaklar:
1. https://github.com/yuksel-arslan/futball-ai adresine git
2. Eğer repo boşsa, hiçbir şey yapma
3. Eğer README varsa ve çakışma olabilirse:
   - Settings > Delete repository
   - Yeni repo oluştur (boş)

### VS Code terminal'de:
```bash
git remote add origin https://github.com/yuksel-arslan/futball-ai.git
git remote -v  # Kontrol
```

## 10. GitHub'a Push

### İlk Push:
```bash
git push -u origin main
```

### Eğer hata alırsanız (repo boş değilse):
```bash
git pull origin main --rebase
git push -u origin main
```

### GitHub Authentication:

**HTTPS kullanıyorsanız:**
- Username: `yuksel-arslan`
- Password: **Personal Access Token** (şifre değil!)

**Personal Access Token oluşturma:**
1. GitHub > Settings > Developer settings
2. Personal access tokens > Tokens (classic)
3. Generate new token
4. Scope: `repo` seç
5. Token'ı kopyala ve kaydet

**SSH kullanmak isterseniz:**
```bash
# SSH key oluştur
ssh-keygen -t ed25519 -C "your-email@example.com"

# Public key'i GitHub'a ekle
cat ~/.ssh/id_ed25519.pub

# Remote'u SSH'e çevir
git remote set-url origin git@github.com:yuksel-arslan/futball-ai.git
```

## 11. Push Başarısını Kontrol

1. https://github.com/yuksel-arslan/futball-ai
2. Tüm dosyaların yüklendiğini kontrol edin

## 12. VS Code Extensions (Önerilen)

Push sonrası geliştirme için yararlı extension'lar:

```
- ESLint
- Prettier
- Prisma
- Tailwind CSS IntelliSense
- GitLens
- Error Lens
- TypeScript Vue Plugin (Volar)
```

VS Code'da: `Ctrl+Shift+X` > Extension ara > Install

## 🎯 Hızlı Komutlar Özeti

```bash
# 1. Klasöre git
cd football-ai

# 2. VS Code aç
code .

# 3. Git başlat
git init
git branch -m main

# 4. Dosyaları ekle
git add .

# 5. Commit
git commit -m "feat: initial project setup"

# 6. Remote ekle
git remote add origin https://github.com/yuksel-arslan/futball-ai.git

# 7. Push
git push -u origin main
```

## 🔄 Sonraki Değişiklikler İçin

```bash
# Değişiklik yaptıktan sonra
git add .
git commit -m "feat: description"
git push
```

## 📦 Proje Kurulumu (Push Sonrası)

```bash
# Dependencies kur
pnpm install

# .env dosyası oluştur
cp .env.example .env
# .env dosyasını doldur

# Database setup
cd packages/database
pnpm db:generate
pnpm db:push

# Development başlat
cd ../..
pnpm dev
```

## 🚨 Troubleshooting

### "remote origin already exists"
```bash
git remote remove origin
git remote add origin https://github.com/yuksel-arslan/futball-ai.git
```

### "failed to push some refs"
```bash
git pull origin main --rebase
git push -u origin main
```

### "authentication failed"
- Personal Access Token kullanın (şifre değil)
- veya SSH key ekleyin

### "node_modules pushed by mistake"
```bash
git rm -r --cached node_modules
git commit -m "chore: remove node_modules"
git push
```

## ✅ Başarı Checklist

- [ ] Paket indirildi ve açıldı
- [ ] VS Code'da açıldı
- [ ] Git config ayarlandı
- [ ] Git init yapıldı
- [ ] Dosyalar commit edildi
- [ ] Remote eklendi
- [ ] Push başarılı
- [ ] GitHub'da dosyalar görünüyor
- [ ] .env dosyası .gitignore'da (asla push edilmemeli)

---

## 🎉 Tamamlandı!

Proje GitHub'da: **https://github.com/yuksel-arslan/futball-ai**

Artık Claude Code veya VS Code ile geliştirmeye devam edebilirsiniz!

## 📚 Sonraki Adımlar

1. ✅ Projeyi GitHub'a aktardınız
2. 📖 `CLAUDE_CODE_GUIDE.md` dosyasını okuyun
3. 🚀 Development'a başlayın:
   - Stats Service
   - User Service  
   - ML Service
4. 🔗 Frontend-Backend integration

**İyi geliştirmeler!** 🚀
