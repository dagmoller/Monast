
var Language = {
	informarion: "Informa&ccedil;&atilde;o",
	error: "Erro",
	warning: "Aten&ccedil;&atilde;o",
	confirmation: "Confirma&ccedil;&atilde;o",
	yes: "Sim",
	no: "N&atilde;o",
	start: "Iniciar",
	stop: "Parar",
	server: "Servidor",
	reload: "Recarregar",
	initializing: "Inicializando",
	create: "Criado",
	uninitialized: "N&atilde;o Inicializando",
	online: "On Line",
	loaded: "Carregado",
	interactive: "Interativo",
	complete: "Completo",
	authenticationRequired: "Autentica&ccedil;&atilde;o Requerida",
	authentication: "Autentica&ccedil;&atilde;o",
	user: "Usu&aacute;rio",
	secret: "Senha",
	login: "Entrar",
	logout: "Sair",
	send: "Enviar",
	clear: "Limpar",
	monastError: "Erro do MonAst",
	errorMessage: "Mensagem de Erro",
	connectionError: "N&atilde;o foi poss&iacute;vel conectar &acrase; http://#{HOSTNAME}:#{HOSTPORT} (#{RESPONSE}).<br>Verifique se o monast.py est&aacute; rodando, para que o painel funcione corretamente.",
	requestError: "A requisi&ccedil;&atilde;o http://#{HOSTNAME}:#{HOSTPORT}/isAuthenticated n&atilde;o foi encontrada.<br>Verifique se o monast.py est&aacute; rodando, para que o painel funcione corretamente.",
	internalServerError: "Recebido um \"Internal Server Error\" ao conectar &acrase; http://#{HOSTNAME}:#{HOSTPORT}/isAuthenticated.<br>Verifique os arquivos de log e reporte os erros em http://monast.sf.net",
	requestStatusError: "Ocorreu um erro ao buscar o status!<br>Por favor recarregue o Monast pressionando F5.",
	invalidUsernameSecret: "Usu&aacute;rio e/ou senha inv&aacute;lidos",
	youMustDefineAnUser: "Voc&ecirc; deve informar um nome de usu&aacute;rio",
	userNotDefined: "Usu&aacute;rio n&atilde;o informado!",
	authenticatingPleaseWait: "Autenticando, por favor aguarde...",
	authenticatedReloading: "Autenticado, recarregando...",
	loggingOutPleaseWait: "Encerrando, por favor aguarde...",
	reloadNeeded: "Favor Recarregar, Pressione F5.",
	reloadingPleaseWait: "Recarregando, por favor aguarde...",
	reloadRequestedPleaseWait: "Recarregando, por favor aguarde...",
	changingServer: "Alternando Servidor...",
	cannotChangeServerOfflineReload: "Imposs&iacute;vel mudar o servidor, Monast desconectado...<br>Favor reinicar...",
	
	mixedPannels: "Paineis",
	peersUsers: "Usu&aacute;rios/Ramais",
	peerUser: "Usu&aacute;rio/Ramal",
	meetmeRooms: "Confer&ecirc;ncias",
	meetme: "Confer&ecirc;ncia",
	parkedCallAt: "Estacionamento",
	parkedCalls: "Estacionamento",
	parkedCalls2: "Chamadas Estacionadas",
	queues: "Filas",
	asteriskCli: "Asterisk CLI",
	debug: "Debug",
	pannelsToShow: "Exibir Paineis",
	
	from: "De",
	to: "Para",
	
	noGroup: "Sem Grupo",
	originateCall: "Originar Chamada",
	viewPeerCalls: "Exibir Canais/Chamadas deste Usu&aacute;rio/Ramal",
	viewPeerInfo: "Exibir Informa&ccedil;&otilde;es deste Usu&aacute;rio/Ramal",
	execute: "Executar",
	sendResetToModem: "Enviar Reset para o Modem",
	reallyResetModem: "Voc&ecirc; realmente precisa resetar este Canal?",
	turnMemberOf: "Adicionar Membro a Fila",
	turnMemberOfQueue: "Adicionar este Usu&aacute;rio como membro da Fila \"#{QUEUENAME}\"?",
	removeMemberFrom: "Remover Membro da Fila",
	removeMemberFromQueue: "Remover este Usu&aacute;rio/Membro da Fila \"#{QUEUENAME}\"?",
	meetmeInvite: "Convite para Confer&ecirc;ncia",
	inviteTo: "Convidar para",
	inviteToMeetme: "Convidar este Usu&aacute;rio para a Confer&ecirc;ncia \"#{MEETME}\"?",
	inviteNumbers: "Convidar N&uacute;meros",
	inviteNumbersToMeetme: "Convidar N&uacute;meros para Confer&ecirc;ncia",
	inviteCallToMeetme: "Convidar esta Chamada para a Confer&ecirc;ncia \"#{MEETME}\"?",
	numbers: "N&uacute;meros",
	onePerLine: "um por linha",
	ifNotExistsCreateDynamic: "caso esta confer&ecirc;ncia n&atilde;o exista,<br>uma nova confer&ecirc;ncia din&acirc;mica ser&aacute; criada",
	meetmeUser: "Usu&aacute;rio",
	kickUser: "Excluir Usu&aacute;rio",
	viewMeetmeUserInfo: "Exibir Informa&ccedil;&otilde;es deste Usu&aacute;rio",
	requestMeetmeKickFrom: "Solicitar Exclus&atilde;o deste Usu&aacute;rio da Confer&ecirc;ncia \"#{MEETME}\"?",
	userNumber: "Usu&aacute;rio N&uacute;mero",
	
	uniqueid: "Uniqueid",
	sourceUniqueid: "Uniqueid (origem)",
	destinationUniqueid: "Uniqueid (destino)",
	
	noActivePeerCalls: "Nenhum Canal ou Chamada ativo para este Usu&aacute;rio/Ramal",
	notValidCalleridNumber: "Este Usu&aacute;rio/Ramal n&atilde;o possui um Callerid (n&uacute;mero) v&aacute;lido para ser transferido",
	
	selectActionForChannel: "Selecione uma a&ccedil;&atilde;o para o canal #{UNIQUEID} (#{CHANNEL})",
	selectActionForCall: "Selecione uma a&ccedil;&atilde;o para a chamada #{UNIQUEID} -&gt; #{BRIDGEDUNIQUEID}",
	selectChannelToTransfer: "Selecione o Canal a ser Transferido",
	selectChannelToPark: "Selecione o Canal a ser Estacionado",
	
	hangup: "Desligar",
	requestHangupChannel: "Requisitar Desligamento deste Canal?",
	requestHangupCall: "Requisitar Desligamento desta Chamada?",
	requestHangupParkedCall: "Requisitar Desligamento desta Chamada Estacionada?",
	
	channel: "Canal",
	channels: "Canais",
	channelType: "Tipo de Canal",
	channelName: "Nome do Canal",
	channelVariables: "Vari&aacute;veis de Canal",
	channelsCalls: "Canais/Chamadas",
	channelMonitored: "Canal sendo Monitorado",
	channelSpyed: "Canal sendo Espionado",
	sourceChannel: "Canal de Origem",
	destinationChannel: "Canal de Destino",
	
	viewChannelInfo: "Exibir Informa&ccedil;&otilde;es do Canal",
	viewCallInfo: "Exibir Informa&ccedil;&otilde;es da Chamada",
	viewParkedCallInfo: "Exibir Informa&ccedil;&otilde;es da Chamada Estacionada",
	
	transfer: "Transferir",
	transferCall: "Transferir Chamada",
	transferDestination: "Destino da Transfer&ecirc;ncia",
	transferParkedCall: "Transferir Chamada Estacionada",
	requestTransferParkedCallTo: "Requisitar Transfer&ecirc;ncia desta Chamada Estacionada para o Usu&aacute;rio/Ramal \"#{CALLERID}\"?",
	
	reallyTransferChannelTo: "Voc&ecirc; realmente deseja transferir o canal \"#{CHANNEL}\" para \"#{CALLERID}\"?",
	
	noSpyerNumber: "N&uacute;mero do Espi&atilde;o n&atilde;o informado!",
	
	spy: "Espionar",
	spyed: "Espionado",
	spyer: "Espi&atilde;o",
	spyerNumber: "N&uacute;mero do Espi&atilde;o",
	requestSpyChannel: "Requisitar espionagem para este canal?",
	requestSpyCall: "Requisitar espionagem para esta Chamada?",
	
	park: "Estacionar",
	
	monitored: "Monitorado",
	monitorStart: "Iniciar Monitora&ccedil;&atilde;o",
	monitorStop: "Parar Monitora&ccedil;&atilde;o",
	monitorToThisChannel: "Monitora&ccedil;&atilde;o neste Canal?",
	
	peerName: "Nome do Usu&aacute;rio",
	peerContext: "Contexto do Usu&aacute;rio",
	
	callerid: "Callerid",
	calleridName: "Callerid (nome)",
	calleridNumber: "Callerid (n&uacute;mero)",
	sourceCallerid: "Callerid (origem)",
	destinationCallerid: "Callerid (destino)",
	
	status: "Estado",
	state: "Estado",
	
	activeCalls: "Chamadas Ativas",
	
	call: "Chamada",
	calls: "chamada(s)",
	calls2: "Chamadas",
	callsAbreviated: "chmd(s)",
	callStatus: "Estado da Chamada",
	callDuration: "Dura&ccedil;&atilde;o da Chamada",
	
	exten: "Posi&ccedil;&atilde;o",
	
	parkedFrom: "Estacionado Por",
	parkedChannel: "Canal Estacionado",
	parkedCalleridName: "Canal Estacionado, Callerid (nome)",
	parkedCalleridNumber: "Canal Estacionado, Callerid (n&uacute;mero)",
	parkedFromCalleridName: "Estacionado Por, Callerid (nome)",
	parkedFromCalleridNumber: "Estacionado Por, Callerid (n&uacute;mero)",
	
	timeout: "Timeout",
	
	latency: "Lat&ecirc;ncia",
	
	queue: "Fila",
	queueMember: "Membro",
	queueClient: "Cliente",
	statistics: "Estat&iacute;sticas",
	max: "Max",
	maxCalls: "Qtd. Max. de Chamadas",
	holdtime: "Tempo de Espera",
	completed: "Completadas",
	completedCalls: "Chamadas Completadas",
	abandoned: "Abandonadas",
	abandonedCalls: "Chamadas Abandonadas",
	serviceLevel: "N&iacute;vel de Servi&ccedil;o",
	serviceLevelPerf: "Performance",
	weight: "Peso",
	members: "Membros",
	clients: "Clientes",
	nameLocation: "Nome/Local",
	callsTaken: "Cham. At.",
	callsTaken2: "Chamadas Atendidas",
	lastCall: "&uacute;ltima Chamada",
	penalty: "Penalty",
	addExternalMember: "Adicionar Membro Externo",
	viewQueueInfo: "Exibir Informa&ccedil;&otilde;es da Fila",
	memberName: "Nome do Membro",
	memberLocation: "Local do Membro",
	membership: "Tipo de Membro",
	locationFormat: "Formato: Local/&lt;numero_externo&gt;@&lt;contexto&gt;",
	answered: "Em Atendimento",
	paused: "Em Pausa",
	pauseMember: "Colocar em Pausa",
	unpauseMember: "Remover da Pausa",
	pauseThisMember: "Colocar este Membro em Pausa?",
	unpauseThisMember: "Retirar este membro da Pausa?",
	removeMember: "Remover Membro",
	removeMemberFromQueue: "Remover este Membro da Fila \"#{QUEUENAME}\"?",
	viewMemberInfo: "Exibir Informa&ccedil;&otilde;es do Membro",
	viewClientInfo: "Exibir Informa&ccedil;&otilde;es do Cliente",
	dropClient: "Remover Cliente (Desligar Chamada)",
	dropThisQueueClient: "Remover este Cliente (Desligar Chamada)?",
	position: "Posi&ccedil;&atilde;o",
	waitingSince: "Aguardando Desde",
	
	createDynamicMeetme: "Criar Confer&ecirc;ncia",
	meetme: "Confer&ecirc;ncia",
	
	_statusMap: {
		"down": "Inativo",
		"unregistered": "N&atilde;o Registrado",
		"unreachable": "Inalcan&ccedil;&aacute;vel",
		"unknown": "Desconhecido",
		"unavailable": "Indispon&iacute;vel",
		"invalid": "Inv&aacute;lido",
		"busy": "Ocupado",
		"logged out": "Deslogado",
		"red alarm": "Al. Vermelho",
		"ring": "Chamando",
		"ringing": "Tocando",
		"ring, in use": "Chamando, em uso",
		"in use": "Em Uso",
		"dial": "Discando",
		"lagged": "Defasado",
		"on hold": "Em Espera",
		"off hook": "Fora do Gancho",
		"yellow alarm": "Al. Amarelo",
		"dnd enabled": "N&atilde;o Perturbe",
		"blue alarm": "Al. Azul",
		"up": "Ativo",
		"link": "Ativa",
		"unlink": "Inativa",
		"registered": "Registrado",
		"reachable": "Alcan&ccedil;&aacute;vel",
		"unmonitored": "N&atilde;o Monitorado",
		"not in use": "Dispon&iacute;vel",
		"logged in": "Logado",
		"no alarm": "Sem Alarmes",
		"on hook": "No Gancho",
		"signal": "Sinal"
	}
};
