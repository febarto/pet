import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Calendar, Clock, User, Phone, DollarSign, BarChart3, Settings,
  Bell, CheckCircle, XCircle, AlertCircle, Heart, Plus, Edit, Eye } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3333';

const fmtLocalDate = (d = new Date()) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const dateTimeFromParts = (dateStr, timeStr) => {
  const [y, mo, d] = dateStr.split('-').map(Number);
  const [hh, mm] = timeStr.split(':').map(Number);
  return new Date(y, (mo - 1), d, hh, mm, 0, 0);
};

export default function AgendamentoSystem() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [services, setServices] = useState([]);
  const [pets, setPets] = useState([]);
  const [resources, setResources] = useState([]);
  const [appointments, setAppointments] = useState([]);

  const [selectedDateSlots, setSelectedDateSlots] = useState(fmtLocalDate(new Date()));
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [slots, setSlots] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showPetForm, setShowPetForm] = useState(false);
  const [selectedPet, setSelectedPet] = useState(null);

  const [form, setForm] = useState({
    clientName: '',
    phone: '',
    date: '',
    time: '',
    serviceId: '',
    petId: '',
    resourceId: 1,
    notes: ''
  });

  const hoje = fmtLocalDate(new Date());
  const totalAgendamentos = appointments.length;
  const totalFaturamento = appointments.reduce((acc, curr) => acc + (curr.service?.priceCents || 0), 0) / 100;
  const agendamentosHoje = appointments.filter(a => a.dateLocal === hoje).length;

  const getStatusColor = (status) => {
    switch (status) {
      case 'CONFIRMED': return 'text-green-600 bg-green-100';
      case 'PENDING': return 'text-yellow-600 bg-yellow-100';
      case 'CANCELED': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };
  const getStatusIcon = (status) => {
    switch (status) {
      case 'CONFIRMED': return <CheckCircle className="w-4 h-4" />;
      case 'PENDING': return <AlertCircle className="w-4 h-4" />;
      case 'CANCELED': return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  async function loadBase() {
    const [svc, pet, res] = await Promise.all([
      axios.get(`${API}/api/services`),
      axios.get(`${API}/api/pets`),
      axios.get(`${API}/api/resources`)
    ]);
    setServices(svc.data);
    setPets(pet.data);
    setResources(res.data);
  }

  async function loadAppointments(date = '') {
    const url = date ? `${API}/api/appointments?date=${date}` : `${API}/api/appointments`;
    const { data } = await axios.get(url);
    setAppointments(data);
  }

  async function loadSlots(date, serviceId) {
    if (!date) return setSlots([]);
    const qs = new URLSearchParams({ date, resourceId: '1' });
    if (serviceId) qs.set('serviceId', String(serviceId));
    const { data } = await axios.get(`${API}/api/slots?${qs.toString()}`);
    setSlots(data.slots);
  }

  useEffect(() => {
    loadBase();
    loadAppointments(hoje);
  }, []);

  useEffect(() => {
    // refresh slots when date or service changes
    loadSlots(selectedDateSlots, selectedServiceId || undefined);
    loadAppointments(selectedDateSlots);
  }, [selectedDateSlots, selectedServiceId]);

  const slotList = slots.length ? slots : [];

  const openFormForSlot = (time) => {
    setForm(prev => ({ ...prev, date: selectedDateSlots, time }));
    setShowForm(true);
  };

  const handleCreateAppointment = async () => {
    const body = {
      clientName: form.clientName,
      phone: form.phone,
      date: form.date,
      time: form.time,
      serviceId: Number(form.serviceId),
      petId: form.petId ? Number(form.petId) : undefined,
      resourceId: Number(form.resourceId || 1),
      notes: form.notes || undefined
    };
    try {
      await axios.post(`${API}/api/appointments`, body);
      setShowForm(false);
      setForm({ clientName: '', phone: '', date: '', time: '', serviceId: '', petId: '', resourceId: 1, notes: '' });
      await Promise.all([loadAppointments(selectedDateSlots), loadSlots(selectedDateSlots, selectedServiceId || undefined)]);
      alert('Agendamento criado com sucesso!');
    } catch (e) {
      const msg = e.response?.data?.error || 'Erro ao criar agendamento';
      alert(msg);
    }
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Agendamentos Hoje</p>
              <p className="text-3xl font-bold text-gray-900">{agendamentosHoje}</p>
            </div>
            <Calendar className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Agendamentos</p>
              <p className="text-3xl font-bold text-gray-900">{totalAgendamentos}</p>
            </div>
            <User className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Faturamento (hoje)</p>
              <p className="text-3xl font-bold text-gray-900">R$ {appointments
                .filter(a => a.dateLocal === hoje)
                .reduce((sum, a) => sum + (a.service?.priceCents || 0), 0 / 100)}</p>
            </div>
            <DollarSign className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">Próximos Agendamentos</h2>
          <button onClick={() => setShowForm(true)}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors">
            + Novo Agendamento
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Serviço</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data/Hora</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {appointments
                .sort((a, b) => new Date(a.startUTC) - new Date(b.startUTC))
                .map((a) => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900">{a.clientName}</p>
                      <p className="text-sm text-gray-500">{a.phone}</p>
                      {a.pet && <p className="text-xs text-blue-600">{a.pet.name} - {a.pet.breed}</p>}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-900">{a.service?.name}</td>
                  <td className="px-6 py-4">
                    <div className="text-gray-900">{new Date(a.startUTC).toLocaleString('pt-BR')}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(a.status)}`}>
                      {getStatusIcon(a.status)}
                      <span className="ml-1 capitalize">{a.status}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-900 font-medium">R$ {(a.service?.priceCents || 0/100).toFixed ? (a.service.priceCents/100).toFixed(2) : '0.00'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderAgendamentos = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <h2 className="text-xl font-semibold">Calendário de Agendamentos</h2>
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-700">Data:</label>
            <input type="date" className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={selectedDateSlots} onChange={(e) => setSelectedDateSlots(e.target.value)} />
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-700">Serviço:</label>
            <select className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={selectedServiceId} onChange={(e) => setSelectedServiceId(e.target.value)}>
              <option value="">(Qualquer)</option>
              {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-medium mb-4">Horários ({selectedDateSlots})</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {slotList.map(({ time, available }) => (
              <button key={time} className={`p-3 border rounded-lg text-center transition ${
                  available ? 'bg-green-100 border-green-300 text-green-700 hover:bg-green-200' :
                              'bg-red-100 border-red-300 text-red-700 cursor-not-allowed'
                }`} disabled={!available} onClick={() => available && openFormForSlot(time)}>
                {time} {available ? '(Livre)' : '(Ocupado)'}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderPets = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-pink-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total de Pets</p>
              <p className="text-3xl font-bold text-gray-900">{pets.length}</p>
            </div>
            <Heart className="w-8 h-8 text-pink-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Vacinas Vencendo</p>
              <p className="text-3xl font-bold text-gray-900">—</p>
            </div>
            <AlertCircle className="w-8 h-8 text-orange-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Agendamentos Hoje</p>
              <p className="text-3xl font-bold text-gray-900">{agendamentosHoje}</p>
            </div>
            <Calendar className="w-8 h-8 text-blue-500" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">Pets Cadastrados</h2>
          <button onClick={() => setShowPetForm(true)}
            className="bg-pink-500 text-white px-4 py-2 rounded-lg hover:bg-pink-600 transition-colors flex items-center">
            <Plus className="w-4 h-4 mr-2" />
            Novo Pet
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
          {pets.map((pet) => (
            <div key={pet.id} className="bg-gray-50 rounded-lg p-4 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <img src={pet.photoUrl} alt={pet.name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-pink-200" />
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg">{pet.name}</h3>
                    <p className="text-sm text-gray-600">{pet.breed}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedPet(pet)} className="text-blue-600 hover:text-blue-800">
                  <Eye className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-600">Dono:</span><span className="font-medium">{pet.ownerName}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Telefone:</span><span className="font-medium">{pet.phone}</span></div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Pet cadastrado</span>
                  <div className="flex space-x-2">
                    <button className="text-green-600 hover:text-green-800">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => {
                      setForm(prev => ({
                        ...prev,
                        clientName: pet.ownerName,
                        phone: pet.phone,
                        notes: `Pet: ${pet.name} (${pet.breed})`,
                        petId: pet.id,
                      }));
                      setShowForm(true);
                    }} className="bg-blue-500 text-white px-3 py-1 rounded text-xs hover:bg-blue-600">
                      Agendar
                    </button>
                  </div>
                </div>
              </div>

            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderServicos = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Gerenciamento de Serviços</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {services.map((s) => (
              <div key={s.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-gray-900">{s.name}</h3>
                    <p className="text-sm text-gray-500">Duração: {s.durationMinutes} min</p>
                    <p className="text-lg font-semibold text-green-600 mt-2">R$ {(s.priceCents/100).toFixed(2)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderForm = () => {
    const petOptions = useMemo(() => pets.map(p => ({ value: p.id, label: `${p.name} (${p.breed}) — ${p.ownerName}` })), [pets]);
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
          <h2 className="text-xl font-semibold mb-4">Novo Agendamento</h2>
          <div className="space-y-4">

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pet (opcional)</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.petId}
                onChange={(e) => {
                  const id = e.target.value;
                  const pet = pets.find(p => String(p.id) === String(id));
                  setForm(prev => ({
                    ...prev,
                    petId: id,
                    clientName: pet ? pet.ownerName : prev.clientName,
                    phone: pet ? pet.phone : prev.phone,
                    notes: pet ? `Pet: ${pet.name} (${pet.breed})` : prev.notes
                  }));
                }}
              >
                <option value="">Selecionar</option>
                {petOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
              <input type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.clientName} onChange={(e) => setForm({...form, clientName: e.target.value})} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
              <input type="tel" className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Serviço</label>
              <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.serviceId} onChange={(e) => { setForm({...form, serviceId: e.target.value}); setSelectedServiceId(e.target.value);} }>
                <option value="">Selecione um serviço</option>
                {services.map((servico) => (
                  <option key={servico.id} value={servico.id}>
                    {servico.name} - R$ {(servico.priceCents/100).toFixed(2)}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                <input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.date} onChange={(e) => { setForm({...form, date: e.target.value}); setSelectedDateSlots(e.target.value || selectedDateSlots); }} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Horário</label>
                <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.time} onChange={(e) => setForm({...form, time: e.target.value})}>
                  <option value="">Selecione</option>
                  {slotList.filter(s => s.available).map(s => (
                    <option key={s.time} value={s.time}>{s.time}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
              <textarea className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="3" value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                Cancelar
              </button>
              <button type="button" onClick={handleCreateAppointment}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                Agendar
              </button>
            </div>

          </div>
        </div>
      </div>
    );
  };

  const renderPetModal = () => {
    if (!selectedPet) return null;
    const pet = selectedPet;
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
          <div className="flex items-center gap-4 mb-4">
            <img src={pet.photoUrl} alt={pet.name} className="w-20 h-20 rounded-full object-cover" />
            <div>
              <h3 className="text-xl font-semibold">{pet.name}</h3>
              <p className="text-sm text-gray-600">{pet.breed}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-gray-600">Dono:</span> <span className="font-medium">{pet.ownerName}</span></div>
            <div><span className="text-gray-600">Telefone:</span> <span className="font-medium">{pet.phone}</span></div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button onClick={() => setSelectedPet(null)} className="px-4 py-2 border rounded-lg">Fechar</button>
            <button onClick={() => {
              setForm(prev => ({
                ...prev,
                clientName: pet.ownerName,
                phone: pet.phone,
                notes: `Pet: ${pet.name} (${pet.breed})`,
                petId: pet.id
              }));
              setSelectedPet(null);
              setShowForm(true);
            }} className="px-4 py-2 bg-blue-600 text-white rounded-lg">
              Agendar para este Pet
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Calendar className="w-8 h-8 text-blue-500" />
              <h1 className="ml-3 text-xl font-semibold text-gray-900">AgendaPro</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Bell className="w-5 h-5 text-gray-500" />
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <aside className="w-full lg:w-64">
            <nav className="bg-white rounded-lg shadow-md p-4">
              <ul className="space-y-2">
                <li>
                  <button onClick={() => setActiveTab('dashboard')}
                    className={`w-full text-left px-4 py-2 rounded-lg flex items-center ${
                      activeTab === 'dashboard' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
                    }`}>
                    <BarChart3 className="w-4 h-4 mr-3" />
                    Dashboard
                  </button>
                </li>
                <li>
                  <button onClick={() => setActiveTab('agendamentos')}
                    className={`w-full text-left px-4 py-2 rounded-lg flex items-center ${
                      activeTab === 'agendamentos' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
                    }`}>
                    <Calendar className="w-4 h-4 mr-3" />
                    Agendamentos
                  </button>
                </li>
                <li>
                  <button onClick={() => setActiveTab('pets')}
                    className={`w-full text-left px-4 py-2 rounded-lg flex items-center ${
                      activeTab === 'pets' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
                    }`}>
                    <Heart className="w-4 h-4 mr-3" />
                    Pets
                  </button>
                </li>
                <li>
                  <button onClick={() => setActiveTab('servicos')}
                    className={`w-full text-left px-4 py-2 rounded-lg flex items-center ${
                      activeTab === 'servicos' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
                    }`}>
                    <Settings className="w-4 h-4 mr-3" />
                    Serviços
                  </button>
                </li>
              </ul>
            </nav>
          </aside>

          <main className="flex-1">
            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'agendamentos' && renderAgendamentos()}
            {activeTab === 'pets' && renderPets()}
            {activeTab === 'servicos' && renderServicos()}
          </main>
        </div>
      </div>

      {showForm && renderForm()}
      {selectedPet && renderPetModal()}
      {showPetForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">Cadastrar novo Pet</h3>
            <NewPet onClose={() => setShowPetForm(false)} onSaved={async () => {
              await loadBase();
              setShowPetForm(false);
            }} />
          </div>
        </div>
      )}
    </div>
  );
}

function NewPet({ onSaved, onClose }) {
  const [f, setF] = useState({ name: '', breed: '', ownerName: '', phone: '', photoUrl: '' });
  const API = import.meta.env.VITE_API_URL || 'http://localhost:3333';
  const save = async () => {
    if (!f.name || !f.breed || !f.ownerName || !f.phone) return alert('Preencha os campos obrigatórios.');
    try {
      await axios.post(`${API}/api/pets`, f);
      onSaved && onSaved();
    } catch (e) {
      alert(e.response?.data?.error || 'Erro ao salvar pet');
    }
  };
  return (
    <div>
      <div className="space-y-3">
        <input className="w-full border rounded-lg px-3 py-2" placeholder="Nome do pet"
          value={f.name} onChange={e => setF({ ...f, name: e.target.value })} />
        <input className="w-full border rounded-lg px-3 py-2" placeholder="Raça"
          value={f.breed} onChange={e => setF({ ...f, breed: e.target.value })} />
        <input className="w-full border rounded-lg px-3 py-2" placeholder="Nome do dono"
          value={f.ownerName} onChange={e => setF({ ...f, ownerName: e.target.value })} />
        <input className="w-full border rounded-lg px-3 py-2" placeholder="Telefone"
          value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} />
        <input className="w-full border rounded-lg px-3 py-2" placeholder="URL da foto (opcional)"
          value={f.photoUrl} onChange={e => setF({ ...f, photoUrl: e.target.value })} />
      </div>
      <div className="flex justify-end gap-3 mt-4">
        <button onClick={onClose} className="px-4 py-2 border rounded-lg">Cancelar</button>
        <button onClick={save} className="px-4 py-2 bg-pink-600 text-white rounded-lg">Salvar Pet</button>
      </div>
    </div>
  );
}
