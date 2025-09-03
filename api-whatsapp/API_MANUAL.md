# Manual de Uso de la API WhatsApp Web.js Multiempresa

## 1. Crear/Iniciar Sesión
- **Endpoint:** POST /session
- **Body:**
```json
{ "sessionId": "empresa1" }
```
- **Respuesta:**
```json
{ "success": true, "message": "Sesión empresa1 creada" }
```

---

## 2. Obtener QR para Autenticación
- **Endpoint:** GET /auth/qr/:sessionId
- **Ejemplo:**
```
GET /auth/qr/empresa1
```
- **Respuesta:**
```json
{ "qr": "data:image/png;base64,..." }
```
- Muestra el QR en tu frontend para escanearlo con WhatsApp.

---

## 3. Verificar Estado de Autenticación
- **Endpoint:** GET /auth/status/:sessionId
- **Ejemplo:**
```
GET /auth/status/empresa1
```
- **Respuesta:**
```json
{ "authenticated": true, "state": "CONNECTED", ... }
```

---

## 4. Enviar Mensaje
- **Endpoint:** POST /send
- **Body:**
```json
{ "sessionId": "empresa1", "phone": "573001234567", "message": "Hola" }
```
- **Respuesta:**
```json
{ "success": true, "result": { ... } }
```

---

## 5. Enviar Archivo (form-data o base64)
- **Endpoint:** POST /send-file
- **Form-data:**
  - sessionId: empresa1
  - phone: 573001234567
  - file: (adjunta archivo)
  - message: (opcional)
- **O JSON (base64):**
```json
{ "sessionId": "empresa1", "phone": "573001234567", "fileBase64": "...", "fileName": "archivo.pdf", "mimeType": "application/pdf", "message": "Aquí va tu archivo" }
```
- **Respuesta:**
```json
{ "success": true, "result": { ... } }
```

---

## 6. Enviar Mensaje a Múltiples Números
- **Endpoint:** POST /send-multiple
- **Body:**
```json
{ "sessionId": "empresa1", "phones": ["573001234567", "573001234568"], "message": "Hola a todos" }
```
- **Respuesta:**
```json
{ "results": [ { "phone": "573001234567", "success": true, ... }, ... ] }
```

---

## 7. Cerrar Sesión
- **Endpoint:** POST /session/logout
- **Body:**
```json
{ "sessionId": "empresa1" }
```
- **Respuesta:**
```json
{ "success": true, "message": "Sesión empresa1 cerrada" }
```

---

## 8. Listar Sesiones Activas
- **Endpoint:** GET /session/list
- **Respuesta:**
```json
{ "sessions": ["empresa1", "empresa2"] }
```

---

## Notas
- Cambia "empresa1" por el identificador de sesión que desees usar para cada empresa o cliente.
- Puedes tener varias sesiones activas y autenticadas al mismo tiempo.
- Para enviar archivos grandes, se recomienda usar form-data.
- Si tienes dudas sobre cómo consumir los endpoints desde Postman, curl o código, pide ejemplos específicos.
