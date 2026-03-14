import React from "react";
import { View, Linking } from "react-native";
import MapView, { Marker } from "react-native-maps";

type MarkerItem = {
  lat: number;
  lng: number;
  title?: string;
  color?: string;
};

type Props = {
  lat: number;
  lng: number;
  extraMarkers?: MarkerItem[];
  height?: number;
  address?: string;
  interactive?: boolean;
};

export function LocationMap({ lat, lng, extraMarkers, height = 200, address, interactive }: Props) {
  return (
    <View style={{ height, overflow: "hidden", borderRadius: 16 }}>
      <MapView
        style={{ flex: 1 }}
        initialRegion={{
          latitude: lat,
          longitude: lng,
          latitudeDelta: 0.003,
          longitudeDelta: 0.003,
        }}
        scrollEnabled={!!interactive}
        zoomEnabled={!!interactive}
        pitchEnabled={false}
        rotateEnabled={false}
        showsUserLocation={false}
      >
        <Marker
          coordinate={{ latitude: lat, longitude: lng }}
          title={address || "거래 장소"}
          pinColor={Colors.error}
        />
        {extraMarkers?.map((m, i) => (
          <Marker
            key={i}
            coordinate={{ latitude: m.lat, longitude: m.lng }}
            title={m.title}
            pinColor={m.color || Colors.primary}
          />
        ))}
      </MapView>
    </View>
  );
}
