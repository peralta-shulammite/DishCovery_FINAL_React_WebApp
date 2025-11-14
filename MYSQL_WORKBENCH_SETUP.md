# MySQL Workbench Setup Guide para sa Aiven Database

## 📥 Pag-install ng MySQL Workbench sa D Drive

### Step 1: Download MySQL Workbench

1. Pumunta sa: https://dev.mysql.com/downloads/workbench/
2. Piliin ang **Windows (x86, 64-bit), MSI Installer**
3. I-download ang installer

### Step 2: Install sa D Drive

1. I-run ang installer
2. Sa **Setup Type**, piliin ang **Custom**
3. I-click ang **Browse** at piliin ang **D:\MySQL\MySQL Workbench** (o kahit anong folder sa D drive)
4. I-continue ang installation

**O kung gusto mo sa default location pero i-move later:**

- I-install sa default location (C:\Program Files\MySQL\MySQL Workbench)
- Pagkatapos, i-move ang folder sa D drive
- I-update ang shortcut

---

## 🔌 Paano Makonekta sa Aiven Database

### Step 1: Buksan ang MySQL Workbench

1. I-launch ang MySQL Workbench
2. Sa **MySQL Connections** panel, i-click ang **+** button (Add New Connection)

### Step 2: I-fill ang Connection Details

**Connection Name:** `Aiven DishCovery DB` (o kahit anong name)

**Connection Method:** `Standard (TCP/IP)`

**Parameters:**

- **Hostname:** `dishcovery-mysql-askiapesa-1f7c.i.aivencloud.com`
- **Port:** `26758`
- **Username:** `avnadmin`
- **Password:** `AVNS_V_0Tp7_nC5ZERnJ39Zn`
- **Default Schema:** `dishcovery_db`

### Step 3: I-configure ang SSL (IMPORTANTE!)

1. I-click ang **SSL** tab
2. I-select ang **Use SSL**
3. I-set ang **SSL Mode:** `Require`
4. **Wag i-fill ang SSL CA, SSL Cert, at SSL Key fields** (iwanan blank)
5. I-check ang **Skip SSL Certificate Validation** (kung available)

**O kung walang "Skip SSL Certificate Validation" option:**

- I-set ang **SSL Mode:** `Required`
- I-leave blank ang lahat ng SSL certificate fields

### Step 4: Test Connection

1. I-click ang **Test Connection** button
2. Kung successful, makikita mo ang "Successfully made the MySQL connection"
3. I-click ang **OK** para i-save ang connection

### Step 5: Connect

1. I-double click ang connection na ginawa mo
2. I-enter ang password kung hihingin: `AVNS_V_0Tp7_nC5ZERnJ39Zn`
3. I-check ang **Save password in vault** para hindi mo na i-enter ulit

---

## 📊 Pag-view ng Database Contents

Pagkatapos makonekta:

1. **Makita ang lahat ng tables:**

   - Sa left panel, i-expand ang `dishcovery_db` database
   - I-click ang **Tables** para makita ang lahat ng tables

2. **View table data:**

   - I-right click ang table name
   - Piliin ang **Select Rows - Limit 1000**
   - O i-double click ang table name

3. **Run SQL queries:**
   - I-click ang **File > New Query Tab**
   - I-type ang SQL query (halimbawa: `SELECT * FROM recipes LIMIT 10;`)
   - I-click ang lightning bolt icon (⚡) para i-execute

---

## 🔑 Quick Reference: Aiven Database Credentials

```
Host: dishcovery-mysql-askiapesa-1f7c.i.aivencloud.com
Port: 26758
Username: avnadmin
Password: AVNS_V_0Tp7_nC5ZERnJ39Zn
Database: dishcovery_db
SSL: Required (true)
```

---

## ⚠️ Troubleshooting

**Kung hindi makakonekta:**

1. **SSL Error:**

   - I-ensure na naka-enable ang SSL
   - I-try ang **Skip SSL Certificate Validation**

2. **Connection Timeout:**

   - I-check ang internet connection
   - I-verify na tama ang hostname at port

3. **Access Denied:**

   - I-verify ang username at password
   - I-check kung active pa ang Aiven database

4. **Can't find database:**
   - I-try ang `defaultdb` instead of `dishcovery_db`
   - I-check sa Aiven console kung ano ang actual database name

---

## 💡 Alternative: Gamitin ang Node.js Script

Kung may problema sa MySQL Workbench, pwede mong gamitin ang existing script:

```bash
cd backend
node check-connections.js
```

O gumawa ng simple query script para makita ang data.
