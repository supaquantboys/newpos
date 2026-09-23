const { readFileSync } = require('node:fs');
const { Script, createContext } = require('node:vm');
const assert = require('node:assert/strict');
const { webcrypto } = require('node:crypto');

const html = readFileSync(require('node:path').join(__dirname, '../index.html'), 'utf8');
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(match => match[1]);
scripts.forEach(source => new Script(source));
const storage = new Map();
const context = createContext({
    console, crypto: webcrypto, TextEncoder, Uint8Array, Date, atob, btoa,
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, String(value)), removeItem: key => storage.delete(key) },
    document: { addEventListener() {} }, confirm: () => true
});
new Script(scripts.find(source => source.includes('const app =')) + '\nglobalThis.testApp = app;').runInContext(context);
const app = context.testApp;
app.renderLicenseUI = () => {};
app.applyLicenseGate = function(valid, code, message, document = null) { this.licenseState = { valid, code, message, document }; };
app.closeProfileMenu = app.closeLicenseModal = app.openLicenseModal = app.showToast = () => {};

(async () => {
    assert.equal(app.isLicenseActive(), false);
    storage.set('business-data', 'preserve me');
    app.activateFreeLicense();
    assert.equal(app.isLicenseActive(), true);
    assert.equal(app.licenseState.document.payload.features.length, 6);
    await app.initializeLicense();
    assert.equal(app.isLicenseActive(), true, 'free activation survives initialization');
    await app.revalidateInstalledLicense();
    assert.equal(app.isLicenseActive(), true, 'periodic checks retain free activation');
    await assert.rejects(() => app.validateLicenseDocument(app.licenseState.document), { code: 'ERR_LICENSE_SCHEMA' });
    app.removeInstalledLicense();
    assert.equal(app.isLicenseActive(), false);
    assert.equal(storage.has('eggProFreeLicense'), false);
    assert.equal(storage.get('business-data'), 'preserve me');
    assert.ok(storage.get('eggProMachineSeed'), 'removal preserves machine identity');
    const signed = { payload: { not_before: new Date(Date.now() - 1000).toISOString(), expires_at: new Date(Date.now() + 60000).toISOString() } };
    app.applyLicenseGate(true, null, '', signed);
    app.activateFreeLicense();
    assert.equal(app.licenseState.document, signed, 'existing active license is preserved');
    await assert.rejects(() => app.validateLicenseDocument({ format: 'offline-license-v1', payload: { schema_version: 1 }, alg: 'Ed25519', kid: app.licenseKeyId, signature: 'invalid' }), { code: 'ERR_SIGNATURE_INVALID' });
    console.log('PASS: script syntax, free activation, reload, revalidation, removal, data preservation, active-license preservation, and signature rejection');
})().catch(error => { console.error(error); process.exitCode = 1; });
