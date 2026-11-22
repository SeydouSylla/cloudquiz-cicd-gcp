// Banque de questions du quiz.
// Chaque question a : un identifiant unique, un thème, l'énoncé, 4 propositions,
// l'index de la bonne réponse (0 = première proposition) et une explication.
// La bonne réponse ne quitte jamais le serveur : la correction se fait dans l'API.

const topics = [
  { id: 'docker', name: 'Docker', icon: 'box-seam', description: 'Images, conteneurs, Dockerfile, réseaux et volumes' },
  { id: 'kvm', name: 'Virtualisation KVM', icon: 'pc-display', description: 'Hyperviseurs, QEMU, libvirt et réseaux virtuels' },
  { id: 'kubernetes', name: 'Kubernetes', icon: 'diagram-3', description: 'Pods, Deployments, Services et architecture du cluster' },
];

const questions = [
  // ---------- Docker ----------
  {
    id: 'docker-1',
    topic: 'docker',
    question: 'Quelle est la différence principale entre une image et un conteneur ?',
    options: [
      'Une image est un modèle en lecture seule, un conteneur en est une instance en cours d\'exécution',
      'Une image tourne en arrière-plan, un conteneur est un fichier',
      'Il n\'y a aucune différence, ce sont deux noms pour la même chose',
      'Une image ne fonctionne que sous Linux, un conteneur fonctionne partout',
    ],
    answer: 0,
    explanation: 'L\'image est un ensemble de couches en lecture seule. Le conteneur ajoute une couche inscriptible au-dessus et exécute un processus.',
  },
  {
    id: 'docker-2',
    topic: 'docker',
    question: 'Quelle instruction du Dockerfile définit la commande lancée au démarrage du conteneur ?',
    options: ['RUN', 'CMD', 'COPY', 'FROM'],
    answer: 1,
    explanation: 'RUN s\'exécute pendant la construction de l\'image, alors que CMD définit la commande par défaut lancée au démarrage du conteneur.',
  },
  {
    id: 'docker-3',
    topic: 'docker',
    question: 'Pourquoi copier package.json et lancer npm ci AVANT de copier le reste du code ?',
    options: [
      'Parce que Docker l\'exige',
      'Pour profiter du cache des couches : les dépendances ne sont réinstallées que si package.json change',
      'Pour rendre l\'image plus sécurisée',
      'Pour que le conteneur démarre plus vite',
    ],
    answer: 1,
    explanation: 'Chaque instruction crée une couche mise en cache. Si package.json ne change pas, la couche npm ci est réutilisée et le build est beaucoup plus rapide.',
  },
  {
    id: 'docker-4',
    topic: 'docker',
    question: 'Que fait l\'option -p 8080:80 de docker run ?',
    options: [
      'Elle limite le conteneur à 80 % du processeur',
      'Elle relie le port 8080 de la machine hôte au port 80 du conteneur',
      'Elle relie le port 80 de l\'hôte au port 8080 du conteneur',
      'Elle lance 80 copies du conteneur',
    ],
    answer: 1,
    explanation: 'La syntaxe est -p PORT_HÔTE:PORT_CONTENEUR. Ici, localhost:8080 sur la machine est redirigé vers le port 80 du conteneur.',
  },
  {
    id: 'docker-5',
    topic: 'docker',
    question: 'Comment conserver les données d\'une base de données quand on supprime son conteneur ?',
    options: [
      'Avec un volume Docker',
      'Avec l\'option --restart always',
      'En utilisant une image plus grosse',
      'Ce n\'est pas possible avec Docker',
    ],
    answer: 0,
    explanation: 'Un volume est stocké en dehors du système de fichiers du conteneur. Il survit à la suppression du conteneur et peut être rattaché à un nouveau.',
  },
  {
    id: 'docker-6',
    topic: 'docker',
    question: 'Dans un fichier docker-compose.yml, comment un service « app » joint-il le service « db » ?',
    options: [
      'Avec l\'adresse IP de la machine hôte',
      'Avec localhost',
      'Avec le nom du service, « db », grâce au DNS du réseau Compose',
      'Il faut obligatoirement exposer le port de db avec -p',
    ],
    answer: 2,
    explanation: 'Compose crée un réseau commun dans lequel chaque service est joignable par son nom. Dans le conteneur app, localhost désigne le conteneur app lui-même.',
  },
  {
    id: 'docker-7',
    topic: 'docker',
    question: 'Pourquoi lancer l\'application avec un utilisateur non root dans le conteneur ?',
    options: [
      'Pour que l\'image soit plus légère',
      'Pour limiter les dégâts si l\'application est compromise',
      'Parce que root ne peut pas ouvrir de port',
      'Pour accélérer le démarrage',
    ],
    answer: 1,
    explanation: 'C\'est le principe du moindre privilège : un attaquant qui prend le contrôle du processus n\'obtient pas les droits root dans le conteneur.',
  },
  {
    id: 'docker-8',
    topic: 'docker',
    question: 'À quoi sert le fichier .dockerignore ?',
    options: [
      'À lister les conteneurs à ne pas démarrer',
      'À exclure des fichiers du contexte de build (node_modules, .git...)',
      'À ignorer les erreurs pendant le build',
      'À masquer des ports',
    ],
    answer: 1,
    explanation: 'Les fichiers listés ne sont pas envoyés au moteur Docker pendant le build : le build est plus rapide et l\'image ne contient pas de fichiers inutiles ou sensibles.',
  },

  // ---------- KVM ----------
  {
    id: 'kvm-1',
    topic: 'kvm',
    question: 'KVM est un hyperviseur de quel type ?',
    options: [
      'Type 1 : il est intégré au noyau Linux',
      'Type 2 uniquement, comme VirtualBox',
      'Ce n\'est pas un hyperviseur mais un émulateur',
      'Un hyperviseur réservé à Windows',
    ],
    answer: 0,
    explanation: 'KVM est un module du noyau Linux qui transforme le noyau lui-même en hyperviseur : on le classe parmi les hyperviseurs de type 1.',
  },
  {
    id: 'kvm-2',
    topic: 'kvm',
    question: 'Quel est le rôle de QEMU quand il est utilisé avec KVM ?',
    options: [
      'Il gère le réseau physique',
      'Il émule le matériel de la machine virtuelle (disques, cartes réseau...) pendant que KVM exécute le processeur',
      'Il remplace complètement KVM',
      'Il sert uniquement à créer des images ISO',
    ],
    answer: 1,
    explanation: 'KVM fournit l\'accélération matérielle du processeur, et QEMU émule les périphériques de la machine virtuelle.',
  },
  {
    id: 'kvm-3',
    topic: 'kvm',
    question: 'Quelle commande liste toutes les machines virtuelles gérées par libvirt, même éteintes ?',
    options: ['virsh list', 'virsh list --all', 'virt-install --list', 'qemu-img list'],
    answer: 1,
    explanation: 'Sans --all, virsh list n\'affiche que les machines en cours d\'exécution.',
  },
  {
    id: 'kvm-4',
    topic: 'kvm',
    question: 'Quel est l\'avantage du format de disque qcow2 ?',
    options: [
      'Il est plus rapide que tous les autres formats',
      'Il occupe seulement l\'espace réellement utilisé et permet les snapshots et les images de base',
      'Il est lisible directement par Windows',
      'Il chiffre toujours les données',
    ],
    answer: 1,
    explanation: 'qcow2 (QEMU Copy-On-Write) grossit au fur et à mesure de l\'écriture et permet de créer des disques qui s\'appuient sur une image de base.',
  },
  {
    id: 'kvm-5',
    topic: 'kvm',
    question: 'En mode réseau « user » de QEMU, quelle est l\'adresse IP habituelle de la machine virtuelle ?',
    options: ['192.168.1.10', '10.0.2.15', '127.0.0.1', '172.17.0.2'],
    answer: 1,
    explanation: 'En mode user, QEMU fournit un petit réseau NAT : la VM reçoit 10.0.2.15, la passerelle est 10.0.2.2 et le DNS 10.0.2.3.',
  },
  {
    id: 'kvm-6',
    topic: 'kvm',
    question: 'Avec un pont (bridge) public, comment la VM apparaît-elle sur le réseau ?',
    options: [
      'Elle est invisible depuis le réseau',
      'Comme une machine à part entière, avec sa propre adresse sur le réseau physique',
      'Elle partage l\'adresse IP de l\'hôte',
      'Elle ne peut joindre que l\'hôte',
    ],
    answer: 1,
    explanation: 'Le pont relie la carte virtuelle de la VM au réseau physique : la VM obtient une adresse du même réseau que l\'hôte.',
  },
  {
    id: 'kvm-7',
    topic: 'kvm',
    question: 'Quel fichier décrit la configuration d\'une machine virtuelle dans libvirt ?',
    options: ['Un fichier YAML', 'Un fichier XML', 'Un fichier JSON', 'Un Dockerfile'],
    answer: 1,
    explanation: 'libvirt décrit chaque domaine (VM) en XML. On peut le modifier avec virsh edit.',
  },
  {
    id: 'kvm-8',
    topic: 'kvm',
    question: 'Pourquoi faut-il activer ip_forward pour qu\'un hôte route le trafic d\'un réseau privé de VM ?',
    options: [
      'Pour que l\'hôte transmette les paquets d\'une interface à une autre',
      'Pour accélérer les disques',
      'Pour autoriser SSH',
      'Pour donner plus de mémoire aux VM',
    ],
    answer: 0,
    explanation: 'Par défaut, Linux ne transmet pas les paquets entre ses interfaces. ip_forward=1 transforme l\'hôte en routeur.',
  },

  // ---------- Kubernetes ----------
  {
    id: 'k8s-1',
    topic: 'kubernetes',
    question: 'Quelle est la plus petite unité que Kubernetes peut déployer ?',
    options: ['Le conteneur', 'Le Pod', 'Le Service', 'Le nœud'],
    answer: 1,
    explanation: 'Kubernetes déploie des Pods. Un Pod contient un ou plusieurs conteneurs qui partagent le même réseau et les mêmes volumes.',
  },
  {
    id: 'k8s-2',
    topic: 'kubernetes',
    question: 'Quel objet maintient automatiquement le nombre voulu de copies d\'un Pod ?',
    options: ['Le Service', 'Le Deployment (via un ReplicaSet)', 'Le Namespace', 'Le ConfigMap'],
    answer: 1,
    explanation: 'Le Deployment décrit l\'état désiré (par exemple 3 réplicas). Son ReplicaSet recrée les Pods qui disparaissent.',
  },
  {
    id: 'k8s-3',
    topic: 'kubernetes',
    question: 'À quoi sert un Service ?',
    options: [
      'À stocker des mots de passe',
      'À donner une adresse stable pour joindre un groupe de Pods',
      'À construire des images',
      'À sauvegarder etcd',
    ],
    answer: 1,
    explanation: 'Les Pods changent d\'adresse IP quand ils sont recréés. Le Service fournit un point d\'accès stable et répartit le trafic entre eux.',
  },
  {
    id: 'k8s-4',
    topic: 'kubernetes',
    question: 'Où Kubernetes stocke-t-il l\'état du cluster ?',
    options: ['Dans etcd', 'Dans le kubelet', 'Dans Docker Hub', 'Dans chaque Pod'],
    answer: 0,
    explanation: 'etcd est une base clé-valeur distribuée qui contient toute la configuration et l\'état du cluster.',
  },
  {
    id: 'k8s-5',
    topic: 'kubernetes',
    question: 'Quel composant choisit le nœud sur lequel un nouveau Pod va tourner ?',
    options: ['Le kubelet', 'Le scheduler', 'kube-proxy', 'etcd'],
    answer: 1,
    explanation: 'Le scheduler du plan de contrôle choisit un nœud selon les ressources disponibles. Le kubelet de ce nœud démarre ensuite le Pod.',
  },
  {
    id: 'k8s-6',
    topic: 'kubernetes',
    question: 'Quel est le rôle du kubelet ?',
    options: [
      'Il expose l\'API du cluster',
      'C\'est l\'agent présent sur chaque nœud qui démarre et surveille les conteneurs des Pods',
      'Il répartit la charge entre les clusters',
      'Il stocke les images',
    ],
    answer: 1,
    explanation: 'Le kubelet reçoit les Pods à exécuter, demande au moteur de conteneurs de les lancer et signale leur état.',
  },
  {
    id: 'k8s-7',
    topic: 'kubernetes',
    question: 'Quelle commande passe un Deployment « web » à 5 réplicas ?',
    options: [
      'kubectl scale deployment web --replicas=5',
      'kubectl run web --count=5',
      'kubectl create web 5',
      'docker scale web=5',
    ],
    answer: 0,
    explanation: 'kubectl scale modifie le nombre de réplicas voulu ; le Deployment crée alors les Pods manquants.',
  },
  {
    id: 'k8s-8',
    topic: 'kubernetes',
    question: 'Que signifie le principe d\'« état désiré » ?',
    options: [
      'On décrit ce que l\'on veut obtenir, et Kubernetes corrige en permanence l\'écart avec la réalité',
      'On exécute les commandes une par une à la main',
      'Le cluster ne change jamais',
      'Chaque Pod choisit son propre état',
    ],
    answer: 0,
    explanation: 'On déclare l\'état voulu (dans un manifeste YAML). Des boucles de contrôle comparent cet état à l\'état réel et agissent pour les rapprocher.',
  },
];

// Petite fonction utilitaire : nombre de questions par thème (pour la page d'accueil)
function countByTopic(topicId) {
  return questions.filter((q) => q.topic === topicId).length;
}

module.exports = { topics, questions, countByTopic };
