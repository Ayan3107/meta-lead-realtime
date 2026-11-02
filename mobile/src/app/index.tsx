
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { io, Socket } from 'socket.io-client';

type Lead = {
  id: string;
  name: string;
  email: string;
  phone: string;
};

const socket: Socket = io('http://192.168.1.232:3000', {
  transports: ['polling', 'websocket'],
  autoConnect: true,
  reconnection: true,
});

export default function HomeScreen() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [connected, setConnected] = useState(socket.connected);

  useEffect(() => {
    const handleConnect = () => {
      setConnected(true);
      console.log('Connected:', socket.id);
    };

    const handleDisconnect = () => {
      setConnected(false);
    };

    const handleLeads = (existingLeads: Lead[]) => {
      setLeads(existingLeads);
    };

    const handleNewLead = (newLead: Lead) => {
      setLeads((current) => [
        newLead,
        ...current.filter((lead) => lead.id !== newLead.id),
      ]);
    };

    // Handle connections established before this screen mounted.
    setConnected(socket.connected);

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('leads', handleLeads);
    socket.on('newLead', handleNewLead);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('leads', handleLeads);
      socket.off('newLead', handleNewLead);
    };
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Meta Lead Dashboard</Text>

      <Text style={{ color: connected ? 'green' : 'red' }}>
        {connected ? 'Connected to server' : 'Connecting to server...'}
      </Text>

      <Text style={styles.count}>{leads.length} Leads Received</Text>

      {leads.length === 0 ? (
        <Text style={styles.empty}>
          No leads yet. Submit a test lead to see it here.
        </Text>
      ) : (
        leads.map((lead) => (
          <View key={lead.id} style={styles.lead}>
            <Text style={styles.name}>{lead.name}</Text>
            <Text>{lead.email}</Text>
            <Text>{lead.phone}</Text>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 25,
    paddingTop: 80,
  },
  heading: {
    fontSize: 25,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  count: {
    fontSize: 19,
    fontWeight: 'bold',
    marginTop: 25,
    marginBottom: 20,
  },
  empty: {
    color: 'gray',
    fontSize: 15,
  },
  lead: {
    backgroundColor: 'white',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
  },
  name: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 5,
  },
});
