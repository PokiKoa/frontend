/**
 * @file contrato.e2e.test.ts
 * @description Integración contra un backend v2 real con los datos de seed_demo:
 * ejercita los servicios del frontend por rol. Crea datos ficticios y se omite
 * salvo que se ejecute con `npm run test:e2e` (ver README).
 */

import { beforeAll, describe, expect, it } from 'vitest';

import { api, guardarAccessToken } from '@/api/axios';
import { alertasService } from '@/services/alertasService';
import {
  cambiarContrasena,
  iniciarSesion,
  obtenerUsuarioActual,
} from '@/services/authService';
import { cunasService } from '@/services/cunasService';
import { medicamentosService } from '@/services/medicamentosService';
import { pacientesService } from '@/services/pacientesService';
import { planesService } from '@/services/planesService';
import { registrosService } from '@/services/registrosService';
import { reportesService } from '@/services/reportesService';
import { turnosService } from '@/services/turnosService';
import { obtenerUmbralesPorDefecto } from '@/services/umbralesService';

const CLAVE = 'Clinica#2026';

async function como(username: string, password = CLAVE) {
  guardarAccessToken(null);
  return iniciarSesion({ username, password });
}

describe.skipIf(!import.meta.env.POKI_E2E)(
  'contrato frontend ↔ backend v2',
  () => {
    beforeAll(() => {
      api.defaults.baseURL =
        import.meta.env.POKI_E2E_API ?? 'http://localhost:8000/api/v1';
    });

    it('neonatología: pacientes, indicaciones, planes y egreso', async () => {
      const yo = await como('dr.soto');
      expect(yo.rol).toBe('medico');
      expect((await obtenerUsuarioActual()).id).toBe(yo.id);

      const cunas = await cunasService.listar();
      expect(cunas.length).toBe(4);
      const libre = cunas.find((c) => c.estado === 'disponible')!;

      const medicos = await pacientesService.medicos();
      const nuevo = await pacientesService.crear({
        identificador: `RN-E2E-${Date.now() % 100000}`,
        nombreCompleto: 'RN Prueba E2E (Ficticio)',
        sexo: 'F',
        fechaNacimiento: new Date().toISOString().slice(0, 10),
        edadGestacional: 34.5,
        pesoNacimiento: 2100,
        diagnostico: 'Prueba',
        medicoId: medicos[0].id,
        cunaId: libre.id,
      });
      expect(nuevo.cunaIdentificador).toBe(libre.identificador);
      const editado = await pacientesService.actualizar(
        nuevo.id,
        {
          ...{
            identificador: nuevo.identificador,
            nombreCompleto: 'RN Prueba E2E editada',
            sexo: 'F',
            fechaNacimiento: nuevo.fechaNacimiento,
            edadGestacional: 35,
            pesoNacimiento: 2100,
            diagnostico: 'Ictericia',
            medicoId: medicos[0].id,
          },
        },
        { incluirDatosMedicos: true }
      );
      expect(editado.diagnostico).toBe('Ictericia');

      const { total } = await pacientesService.listar({
        estado: 'activo',
        search: 'E2E',
      });
      expect(total).toBeGreaterThan(0);
      await pacientesService.lecturas(nuevo.id);
      expect(
        (await pacientesService.pesos(nuevo.id)).map((p) => p.pesoG)
      ).toEqual([2100]);

      const catalogo = await medicamentosService.listarCatalogo();
      const local = new Date(Date.now() - 2 * 3600_000);
      local.setMinutes(local.getMinutes() - local.getTimezoneOffset());
      const indicacion = await medicamentosService.crearPrescripcion({
        paciente: nuevo.id,
        medicamentoId: catalogo[0].id,
        dosis: '5 mg/kg',
        unidadesPorDosis: 1,
        via: 'IV',
        inicio: local.toISOString().slice(0, 16),
        frecuenciaHoras: 8,
        fin: null,
      });
      expect(indicacion.estado).toBe('Vigente');
      expect(indicacion.atrasada).toBe(true);
      const dada = await medicamentosService.administrar(indicacion.id, {
        notas: 'E2E',
      });
      expect(dada.dosisAdministradas).toBe(1);
      expect(
        (await medicamentosService.administraciones(indicacion.id))[0].notas
      ).toBe('E2E');

      const plan = await planesService.crear({
        paciente: nuevo.id,
        areaCuidado: 'Termorregulación',
        intervencion: 'Control',
        frecuencia: 'Cada 3 h',
        estado: 'Activo',
      });
      expect((await planesService.suspender(plan.id)).estado).toBe(
        'Suspendido'
      );
      await planesService.observar(nuevo.id, 'medica', 'Observación E2E');
      expect((await planesService.observaciones(nuevo.id))[0].contenido).toBe(
        'Observación E2E'
      );

      const egresado = await pacientesService.egresar(nuevo.id, {
        resultado: 'sobrevivio',
        causa: 'no_aplica',
        notas: '',
      });
      expect(egresado.estado).toBe('egresado');
      const cancelada = (
        await medicamentosService.listarPrescripciones({ pacienteId: nuevo.id })
      )[0];
      expect(cancelada.estado).toBe('Cancelada');
    });

    it('enfermería: mis cunas, alertas, peso y reportes', async () => {
      await como('matrona.diaz');
      const mias = await turnosService.misCunas();
      expect(mias.cunas.map((c) => c.cunaIdentificador).sort()).toEqual([
        'C-01',
        'C-02',
      ]);
      const { alertas } = await alertasService.listar({ abiertas: true });
      if (alertas[0]) {
        const reconocida = alertas.find((a) => a.estado === 'activa');
        if (reconocida)
          expect((await alertasService.reconocer(reconocida.id)).estado).toBe(
            'reconocida'
          );
      }
      const paciente = (await pacientesService.listar({ estado: 'activo' }))
        .pacientes[0];
      expect(
        (await pacientesService.registrarPeso(paciente.id, 1600)).pesoG
      ).toBe(1600);
      const reporte = await reportesService.reporte();
      expect(reporte.resumen.totalCunas).toBe(4);
      expect((await reportesService.serie(7)).serie).toHaveLength(7);
      expect((await obtenerUmbralesPorDefecto()).heart_rate_warning_low).toBe(
        100
      );
      await expect(
        cambiarContrasena('incorrecta', 'OtraClave#2027')
      ).rejects.toBeTruthy();
    });

    it('administración: turnos, asignaciones y auditoría', async () => {
      await como('admin', 'admin2026');
      const turnos = await turnosService.listarTurnos();
      expect(turnos.filter((t) => t.actual)).toHaveLength(1);
      const personal = await turnosService.personalAsignable();
      const cunas = await cunasService.listar();
      const enfermera = personal.find((p) => p.rol === 'enfermeria')!;
      await turnosService.crearAsignacion({
        usuario: enfermera.id,
        turno: 'morning',
        cuna: cunas[3].id,
        fecha: '2030-01-01',
      });
      const asignaciones = await turnosService.listarAsignaciones('2030-01-01');
      expect(asignaciones[0].turnoNombre).toBe('Mañana');
      await turnosService.eliminarAsignacion(asignaciones[0].id);

      const { total, registros } = await registrosService.listar({
        accion: 'administrar',
      });
      expect(total).toBeGreaterThan(0);
      expect(registros[0].camposModificados.length).toBeGreaterThan(0);
      expect((await registrosService.resumen()).length).toBeGreaterThan(3);
      const mantenimiento = cunas.find(
        (c) => c.estado === 'disponible' && c.pacienteId === null
      );
      if (mantenimiento) {
        await cunasService.cambiarMantenimiento(mantenimiento.id, true);
        await cunasService.cambiarMantenimiento(mantenimiento.id, false);
      }
    });

    it('farmacia: catálogo y permisos', async () => {
      await como('qf.silva');
      const item = await medicamentosService.crearCatalogo({
        nombre: `Fármaco E2E ${Date.now() % 10000}`,
        principioActivo: 'X',
        dosisMg: 10,
        unidad: 'vial',
        stock: 3,
        stockMinimo: 5,
        activo: true,
      });
      expect(item.stockBajo).toBe(true);
      expect(
        (await medicamentosService.listarCatalogo({ stockBajo: true })).some(
          (i) => i.id === item.id
        )
      ).toBe(true);
      await expect(registrosService.listar()).rejects.toBeTruthy();
    });
  }
);
