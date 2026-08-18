# 🏦 PRESTAPP - Sistema de Gestión Financiera y Cobranza en Campo

**PRESTAPP** es una aplicación web progresiva y adaptativa para la administración global de préstamos, rutas de cobranza en campo, clientes, usuarios/cobradores y auditoría de recibos de pago térmicos.

---

## 🚀 Características Principales

- 📊 **Tablero Financiero (Dashboard):** KPIs en vivo de cartera total, recaudo diario, índice de mora y cumplimiento por rutas y cobradores.
- 👥 **Gestión de Clientes con Verificación Fotográfica:** Registro de clientes con hasta 3 fotografías (Fachada de Casa, Perfil de Cliente y Documento de Identidad) integradas con Cloudinary.
- 📍 **Administración de Rutas y Zonas:** Asignación de zonas geográficas a cobradores con prevención de eliminación de rutas con clientes activos y reasignación directa.
- 💵 **Calculadora de Préstamos y Amortización:** Creación de préstamos con cálculo automático de interés, cuotas, frecuencia y estado.
- 🧾 **Comprobantes Térmicos e Integración WhatsApp:** Generación de recibos térmicos imprimibles y formato listo para enviar por WhatsApp.
- 👮 **Auditoría y Anulación de Pagos (Solo Admin):** Visualización de cobradores en cada transacción y anulación/eliminación restringida a Administradores con reversión automática de saldos.
- 📱 **Diseño 100% Adaptativo para Móviles:** Optimizado con Tailwind CSS v3 para su uso cómodo en teléfonos y tabletas en campo.

---

## 🛠️ Tecnologías Utilizadas

- **Frontend:** React 18 + TypeScript + Vite
- **Estilos:** Tailwind CSS v3 (Diseño Dark Premium Glassmorphism)
- **Iconos:** Lucide React
- **Base de Datos & Backend:** Supabase (PostgreSQL) + LocalStorage Sync
- **Imágenes en la Nube:** Cloudinary

---

## 📦 Instalación y Ejecución Local

1. Clonar el repositorio:
   ```bash
   git clone https://github.com/TU_USUARIO/prestapp.git
   cd prestapp
   ```

2. Instalar dependencias:
   ```bash
   npm install
   ```

3. Ejecutar el servidor de desarrollo:
   ```bash
   npm run dev
   ```

4. Abrir en el navegador:
   `http://localhost:5175`

## Despliegue en Vercel

1. Crea un repositorio en GitHub y sube este proyecto. El archivo `.env` está excluido para evitar publicar credenciales.
2. En Vercel, importa el repositorio y selecciona el preset **Vite**.
3. Usa `npm run build` como comando de compilación y `dist` como directorio de salida.
4. En **Settings > Environment Variables**, añade las cuatro variables indicadas en `.env.example` tanto para Production como para Preview.
5. Despliega. `vercel.json` mantiene funcionando las rutas internas de React al recargar la página.

---

## 📝 Licencia

Este proyecto está bajo la licencia MIT.
