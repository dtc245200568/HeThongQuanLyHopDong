const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const client = require('prom-client');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 4000;

// 1. Cấu hình ghi Log ra file cho Loki + Promtail
const logFile = '/var/log/contract-app/app.log';
function writeLog(level, action, message) {
    const logEntry = `${new Date().toISOString()} [${level}] action=${action} msg="${message}"\n`;
    fs.appendFileSync(logFile, logEntry);
    console.log(logEntry.trim());
}

// 2. Cấu hình Prometheus Metrics
const register = new client.Registry();
client.collectDefaultMetrics({ register });
const httpRequestCounter = new client.Counter({
    name: 'contract_http_requests_total',
    help: 'Tong so HTTP request vao he thong hop dong',
    labelNames: ['method', 'route', 'status']
});
register.registerMetric(httpRequestCounter);

// 3. Kết nối PostgreSQL
const pool = new Pool({
    user: 'contract_admin',
    host: '127.0.0.1',
    database: 'contract_db',
    password: 'MatKhauManh123!',
    port: 5432,
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(bodyParser.urlencoded({ extended: true }));

// Middleware đếm request và ghi log
app.use((req, res, next) => {
    res.on('finish', () => {
        httpRequestCounter.inc({ method: req.method, route: req.path, status: res.statusCode });
    });
    next();
});

// Route 1: Trang chủ - Theo dõi danh sách hợp đồng & lọc trạng thái
app.get('/', async (req, res) => {
    try {
        const statusFilter = req.query.status || '';
        let query = 'SELECT * FROM contracts ORDER BY id DESC';
        let params = [];
        if (statusFilter) {
            query = 'SELECT * FROM contracts WHERE status = $1 ORDER BY id DESC';
            params = [statusFilter];
        }
        const result = await pool.query(query, params);
        writeLog('INFO', 'VIEW_CONTRACTS', `Viewed contract list, count=${result.rows.length}`);
        res.render('index', { contracts: result.rows, statusFilter });
    } catch (err) {
        writeLog('ERROR', 'VIEW_CONTRACTS_ERR', err.message);
        res.status(500).send('Lỗi máy chủ CSDL');
    }
});

// Route 2: Tạo hợp đồng mới
app.post('/contracts/create', async (req, res) => {
    const { contract_code, title, stakeholders, contract_value, start_date, end_date, status } = req.body;
    try {
        await pool.query(
            `INSERT INTO contracts (contract_code, title, stakeholders, contract_value, start_date, end_date, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [contract_code, title, stakeholders, contract_value || 0, start_date, end_date, status]
        );
        writeLog('INFO', 'CREATE_CONTRACT', `Created contract code=${contract_code} stakeholders="${stakeholders}" status="${status}"`);
        res.redirect('/');
    } catch (err) {
        writeLog('ERROR', 'CREATE_CONTRACT_ERR', `Failed code=${contract_code} error="${err.message}"`);
        res.status(400).send('Lỗi tạo hợp đồng (Mã hợp đồng có thể đã tồn tại): ' + err.message);
    }
});

// Route 3: Cập nhật trạng thái hợp đồng
app.post('/contracts/status/:id', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        await pool.query('UPDATE contracts SET status = $1 WHERE id = $2', [status, id]);
        writeLog('INFO', 'UPDATE_STATUS', `Updated contract id=${id} new_status="${status}"`);
        res.redirect('/');
    } catch (err) {
        writeLog('ERROR', 'UPDATE_STATUS_ERR', err.message);
        res.status(500).send('Lỗi cập nhật trạng thái');
    }
});

// Route 4: Xóa hợp đồng
app.post('/contracts/delete/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM contracts WHERE id = $1', [id]);
        writeLog('WARN', 'DELETE_CONTRACT', `Deleted contract id=${id}`);
        res.redirect('/');
    } catch (err) {
        writeLog('ERROR', 'DELETE_CONTRACT_ERR', err.message);
        res.status(500).send('Lỗi xóa hợp đồng');
    }
});

// Route 5: Endpoint Metrics cho Prometheus
app.get('/metrics', async (req, res) => {
    res.setHeader('Content-Type', register.contentType);
    res.send(await register.metrics());
});

app.listen(PORT, '127.0.0.1', () => {
    writeLog('INFO', 'SERVER_START', `Contract Management Server running on http://127.0.0.1:${PORT}`);
});
