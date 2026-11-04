import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { firstValueFrom } from 'rxjs';
import { MapPointEntity } from '../models/map-point.entity';
import { FloodReportEntity } from '../../reports/models/flood-report.entity';
import {
  CreateMapPointDto,
  QueryMapPointsDto,
  UpdateMapPointDto,
} from '../dtos/query-map-points.dto';
import { WeatherService } from '../../weather/services/weather.service';

@Injectable()
export class MapService {
  private readonly logger = new Logger(MapService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly weatherService: WeatherService,
    @InjectRepository(MapPointEntity)
    private readonly mapPointRepo: Repository<MapPointEntity>,
    @InjectRepository(FloodReportEntity)
    private readonly reportRepo: Repository<FloodReportEntity>,
  ) {}

  /**
   * Cấu hình Vector Basemap miễn phí đẹp như Google Maps / Uber Maps cho MapLibre GL
   */
  getMapConfig() {
    return {
      center: [106.6827, 10.7694],
      defaultZoom: 14,
      recommendedStyle: 'https://tiles.openfreemap.org/styles/liberty',
      styles: {
        openFreeMapLiberty: {
          name: 'OpenFreeMap Liberty (Vector 3D - Giống Google Maps)',
          url: 'https://tiles.openfreemap.org/styles/liberty',
          requiresApiKey: false,
        },
        openFreeMapBright: {
          name: 'OpenFreeMap Bright (Vector Sáng rõ)',
          url: 'https://tiles.openfreemap.org/styles/bright',
          requiresApiKey: false,
        },
        cartoVoyager: {
          name: 'CARTO Voyager (Phong cách Uber Maps - Nổi bật đường ngập)',
          url: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
          requiresApiKey: false,
        },
        cartoPositron: {
          name: 'CARTO Positron (Nền sáng tối giản)',
          url: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
          requiresApiKey: false,
        },
      },
      routingApi: 'https://router.project-osrm.org/route/v1/driving',
      geocodingApi: 'https://photon.komoot.io/api',
    };
  }

  async findAllPoints(query: QueryMapPointsDto): Promise<MapPointEntity[]> {
    const allPoints = await this.mapPointRepo.find();
    const activeLayers = query.layers
      ? query.layers.split(',').map((s) => s.trim())
      : ['flood', 'risk', 'rain', 'history'];

    return allPoints.filter((point) => {
      if (
        query.severity &&
        query.severity !== 'all' &&
        point.severity !== query.severity
      ) {
        return false;
      }

      const matchFlood =
        activeLayers.includes('flood') &&
        (point.type === 'flood' || point.type === 'pending');
      const matchRisk =
        activeLayers.includes('risk') && point.type === 'risk';
      const matchRain =
        activeLayers.includes('rain') && point.type === 'sensor';
      const matchHistory =
        activeLayers.includes('history') && point.historyCount >= 10;

      return matchFlood || matchRisk || matchRain || matchHistory;
    });
  }

  async findPointById(id: string) {
    const point = await this.mapPointRepo.findOne({ where: { id } });
    if (!point) {
      throw new NotFoundException(`Không tìm thấy điểm bản đồ ${id}`);
    }
    let linkedReport: FloodReportEntity | null = null;
    if (point.linkedReportId) {
      linkedReport = await this.reportRepo.findOne({
        where: { id: point.linkedReportId },
      });
    }
    return {
      ...point,
      linkedReport,
    };
  }

  async createPoint(dto: CreateMapPointDto): Promise<MapPointEntity> {
    const lat = dto.lat ?? 10.7769;
    const lng = dto.lng ?? 106.7009;
    const elevationM = await this.weatherService.fetchElevation(lat, lng, 2.8);

    const point = this.mapPointRepo.create({
      ...dto,
      lat,
      lng,
      elevationM,
      historyCount: dto.historyCount ?? 1,
    });
    return this.mapPointRepo.save(point);
  }

  async updatePoint(
    id: string,
    dto: UpdateMapPointDto,
  ): Promise<MapPointEntity> {
    const point = await this.mapPointRepo.findOne({ where: { id } });
    if (!point) {
      throw new NotFoundException(`Không tìm thấy điểm bản đồ ${id}`);
    }
    Object.assign(point, dto);
    return this.mapPointRepo.save(point);
  }

  /**
   * Tìm kiếm địa điểm / Autocomplete thời gian thực tại TP.HCM (kiểu Google Maps)
   * Kết hợp ArcGIS World Geocoder (POI + địa chỉ tiếng Việt) & Photon OpenStreetMap
   */
  async searchPlaces(keyword: string, limit = 6) {
    const cleanKeyword = (keyword || '').trim();
    if (!cleanKeyword) {
      return [];
    }

    const photonBase = this.configService.get<string>(
      'PHOTON_BASE_URL',
      'https://photon.komoot.io',
    );

    const results: Array<{
      name: string;
      address: string;
      street: string;
      district: string;
      lat: number;
      lng: number;
    }> = [];

    // 1. ArcGIS World Geocoding Service (nhận diện cực tốt địa danh, trường đại học, số nhà, tên đường tại TP.HCM, phản hồi ~150ms)
    const arcgisRes = await firstValueFrom(
      this.httpService.get(
        'https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates',
        {
          params: {
            SingleLine: `${cleanKeyword}, Hồ Chí Minh`,
            f: 'json',
            countryCode: 'VNM',
            location: '106.7009,10.7769',
            searchExtent: '106.35,10.35,107.05,11.16',
            outFields: 'PlaceName,Place_addr,StAddr,Nbrhd,District,City,Subregion',
            maxLocations: limit,
          },
          timeout: 1800,
        },
      ),
    ).catch(() => null);

    const candidates = arcgisRes?.data?.candidates ?? [];
    // Chỉ gọi thêm Photon OSM nếu ArcGIS trả về ít hơn 3 kết quả (tránh bị Photon ở châu Âu làm chậm 2-3 giây)
    const photonRes =
      candidates.length >= 3
        ? null
        : await firstValueFrom(
            this.httpService.get(`${photonBase}/api/`, {
              params: {
                q: `${cleanKeyword}, Hồ Chí Minh`,
                lat: 10.7769,
                lon: 106.7009,
                limit,
              },
              timeout: 1200,
            }),
          ).catch(() => null);
    for (const c of candidates) {
      const lat = c?.location?.y;
      const lng = c?.location?.x;
      if (typeof lat !== 'number' || typeof lng !== 'number') continue;
      const attrs = c?.attributes ?? {};
      const mainName =
        attrs.PlaceName || attrs.StAddr || c.address?.split(',')[0] || cleanKeyword;
      const district =
        attrs.District || attrs.Subregion || attrs.Nbrhd || attrs.City || 'TP. Hồ Chí Minh';
      const fullAddress =
        attrs.Place_addr || c.address || `${mainName}, ${district}, TP. Hồ Chí Minh`;

      if (!results.some((r) => r.name.toLowerCase() === mainName.toLowerCase() && Math.abs(r.lat - lat) < 0.002)) {
        results.push({
          name: mainName,
          address: fullAddress,
          street: attrs.StAddr || mainName,
          district,
          lat,
          lng,
        });
      }
    }

    const features = photonRes?.data?.features ?? [];
    for (const f of features) {
      const lng = f?.geometry?.coordinates?.[0];
      const lat = f?.geometry?.coordinates?.[1];
      if (typeof lat !== 'number' || typeof lng !== 'number') continue;
      const props = f?.properties ?? {};
      const mainName =
        props.name ||
        [props.housenumber, props.street].filter(Boolean).join(' ') ||
        cleanKeyword;
      const district =
        props.district || props.city || props.county || 'TP. Hồ Chí Minh';
      const fullAddress = [
        props.housenumber ? `${props.housenumber} ${props.street || ''}`.trim() : props.street,
        props.suburb,
        district,
        'TP. Hồ Chí Minh',
      ]
        .filter(Boolean)
        .join(', ');

      if (!results.some((r) => r.name.toLowerCase() === mainName.toLowerCase() && Math.abs(r.lat - lat) < 0.002)) {
        results.push({
          name: mainName,
          address: fullAddress || `${mainName}, ${district}`,
          street: props.street || mainName,
          district,
          lat,
          lng,
        });
      }
    }

    return results.slice(0, limit);
  }

  /**
   * Reverse Geocoding: Đổi tọa độ GPS sang tên đường, Quận/Huyện qua Nominatim OSM API
   */
  async reverseGeocode(lat: number, lng: number) {
    const nominatimBase = this.configService.get<string>(
      'NOMINATIM_BASE_URL',
      'https://nominatim.openstreetmap.org',
    );
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${nominatimBase}/reverse`, {
          params: {
            lat,
            lon: lng,
            format: 'jsonv2',
            'accept-language': 'vi',
          },
          headers: {
            'User-Agent': 'SaigonDrainAI-Hackathon/1.0',
          },
          timeout: 4500,
        }),
      );
      const addr = response.data?.address ?? {};
      const location =
        [addr.house_number, addr.road].filter(Boolean).join(' ') ||
        response.data?.name ||
        '105 Bà Huyện Thanh Quan';
      const district =
        addr.suburb ||
        addr.city_district ||
        addr.county ||
        addr.city ||
        'Quận 3';

      return {
        lat,
        lng,
        location,
        district,
        displayName:
          response.data?.display_name || `${location}, ${district}, TP.HCM`,
      };
    } catch {
      return {
        lat,
        lng,
        location: '105 Bà Huyện Thanh Quan',
        district: 'Quận 3',
        displayName: '105 Bà Huyện Thanh Quan, Quận 3, TP. Hồ Chí Minh',
      };
    }
  }

  /**
   * Lấy độ cao địa hình (mét) từ Open-Meteo Elevation API và đánh giá vùng trũng
   */
  async getElevationAndTerrainRisk(lat: number, lng: number) {
    const elevationM = await this.weatherService.fetchElevation(lat, lng, 2.4);
    const isLowLying = elevationM <= 2.5;
    return {
      lat,
      lng,
      elevationM,
      terrainClassification:
        elevationM <= 2.0
          ? 'Vùng rất trũng (Nguy cơ ngập triều cường & mưa lớn rất cao)'
          : elevationM <= 3.5
            ? 'Vùng thấp (Cần chú ý thoát nước khi mưa trên 30mm)'
            : 'Nền địa hình cao (Thoát nước tốt)',
      isLowLying,
    };
  }
}

