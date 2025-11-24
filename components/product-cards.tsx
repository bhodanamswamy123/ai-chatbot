import { Card, CardContent } from '@/components/ui/card';
import { Package, Heart } from 'lucide-react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';

interface ProductSku {
  skuCode: string;
  barcode: string;
  manufacturerCode: string;
  imageUrl: string;
}

interface Product {
  productName: string;
  productDescription: string;
  productCode: string;
  brandName: string;
  imageUrl: string;
  skus: ProductSku[];
  totalSkuCount: number;
}

interface ProductCardsProps {
  products: Product[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  searchString?: string;
  sirvUrlPrefix?: string;
}

export function ProductCards({
  products,
  totalCount,
  pageIndex,
  pageSize,
  searchString,
  sirvUrlPrefix = '',
}: ProductCardsProps) {
  const totalPages = Math.ceil(totalCount / pageSize);

  // Helper function to construct full image URL
  const getImageUrl = (imageUrl: string) => {
    if (!imageUrl) return '';
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }
    return sirvUrlPrefix ? `${sirvUrlPrefix}${imageUrl}` : imageUrl;
  };

  // Helper function to strip HTML tags from text
  const stripHtml = (html: string) => {
    if (!html) return '';
    // Remove HTML tags
    const withoutTags = html.replace(/<[^>]*>/g, ' ');
    // Replace multiple spaces with single space
    const cleaned = withoutTags.replace(/\s+/g, ' ').trim();
    return cleaned;
  };

  return (
    <div className="w-full space-y-4">
      {/* Header with search info */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div>
          {searchString && (
            <span>
              Results for <span className="font-medium text-foreground">"{searchString}"</span>
            </span>
          )}
          <span className="ml-2">
            {totalCount} {totalCount === 1 ? 'product' : 'products'} found
          </span>
        </div>
        {totalPages > 1 && (
          <div>
            Page {pageIndex} of {totalPages}
          </div>
        )}
      </div>

      {/* Product Carousel */}
      <Carousel
        opts={{
          align: 'start',
          loop: true,
        }}
        className="w-full relative px-8"
      >
        <CarouselContent className="-ml-2 md:-ml-4 mb-6 px-8">
          {products.map((product, index) => (
            <CarouselItem key={`${product.productCode}-${index}`} className="pl-2 md:pl-4 basis-full md:basis-1/2">
              <Card className="overflow-hidden rounded-3xl border-none shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-purple-100 to-blue-100 h-full flex flex-col"
              >
            {/* Product Image with Gradient Background */}
            <div className="relative w-full h-64 bg-gradient-to-br from-purple-400/80 to-blue-400/80 flex items-center justify-center p-6">
              {/* Heart Icon */}
              <button className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors">
                <Heart className="w-5 h-5 text-white" />
              </button>

              {/* Product Image */}
              {product.imageUrl ? (
                <img
                  src={getImageUrl(product.imageUrl)}
                  alt={product.productName}
                  className="max-w-full max-h-full object-contain drop-shadow-2xl"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement!.querySelector('.fallback-icon')!.classList.remove('hidden');
                  }}
                />
              ) : null}
              <div className={`fallback-icon ${product.imageUrl ? 'hidden' : ''}`}>
                <Package className="w-16 h-16 text-white/50" />
              </div>
            </div>

            {/* Product Info - White Card at Bottom */}
            <CardContent className="bg-white rounded-t-3xl -mt-6 relative z-10 p-6 space-y-4 flex-1 flex flex-col">
              {/* Product Name */}
              <h3 className="text-xl font-bold text-gray-900 line-clamp-2">
                {stripHtml(product.productName)}
              </h3>

              {/* SKU Badges - Similar to Size/Color badges in screenshot */}
              {product.skus.length > 0 && product.skus.some(sku => sku.skuCode && sku.skuCode !== '--') && (
                <div className="flex flex-wrap gap-2">
                  {product.skus
                    .filter(sku => sku.skuCode && sku.skuCode !== '--')
                    .slice(0, 2)
                    .map((sku, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 border border-gray-300 rounded text-xs font-medium text-gray-700 uppercase"
                      >
                        {sku.skuCode}
                      </span>
                    ))}
                  {product.skus.filter(sku => sku.skuCode && sku.skuCode !== '--').length > 2 && (
                    <span className="px-3 py-1 border border-gray-300 rounded text-xs font-medium text-gray-500">
                      +{product.skus.filter(sku => sku.skuCode && sku.skuCode !== '--').length - 2} more
                    </span>
                  )}
                </div>
              )}

              {/* Brand Badge if available */}
              {product.brandName && (
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-gray-100 rounded text-xs font-medium text-gray-700">
                    {product.brandName}
                  </span>
                </div>
              )}

              {/* Description */}
              {product.productDescription && (
                <p className="text-sm text-gray-600 line-clamp-3">
                  {stripHtml(product.productDescription)}
                </p>
              )}

              {/* Product Code */}
              <div className="pt-2 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  Code: <span className="font-mono font-medium">{product.productCode}</span>
                </p>
              </div>

              {/* Price Section - Note: Price not available from API */}
              {/* <div className="flex items-center justify-between pt-2">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Price</p>
                  <p className="text-sm text-gray-400 italic">Contact for pricing</p>
                </div>
              </div> */}

              {/* Spacer to push button to bottom */}
              {/* <div className="flex-1"></div> */}

              {/* View Details Button */}
              {/* <button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-xl font-medium hover:from-purple-700 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg">
                View Details
              </button> */}
            </CardContent>
          </Card>
        </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="left-2 top-1/3 h-12 w-12 bg-white/90 hover:bg-white shadow-xl border-2 border-purple-300 text-purple-600 hover:text-purple-700 z-10" />
        <CarouselNext className="right-2 top-1/3 h-12 w-12 bg-white/90 hover:bg-white shadow-xl border-2 border-purple-300 text-purple-600 hover:text-purple-700 z-10" />
      </Carousel>

      {/* Empty State */}
      {products.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Package className="w-16 h-16 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-medium mb-2">No products found</h3>
          <p className="text-sm text-muted-foreground">
            {searchString
              ? `No products match "${searchString}"`
              : 'Try adjusting your search criteria'}
          </p>
        </div>
      )}
    </div>
  );
}
