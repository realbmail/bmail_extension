using System;
using System.Globalization;
using System.Windows.Data;
namespace BMailApp
{
    public class WidthToFontSizeConverter : IValueConverter
    {
        // 允许在 XAML 中设置最小字体和缩放因子
        public double MinFontSize { get; set; } = 10;
        public double Factor { get; set; } = 20; // 根据实际效果调整因子

        public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
        {
            if (value is double width)
            {
                double size = width / Factor;
                return size < MinFontSize ? MinFontSize : size;
            }
            return MinFontSize;
        }

        public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
        {
            throw new NotImplementedException();
        }
    }
}